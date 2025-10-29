from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth import authenticate
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.shortcuts import get_object_or_404
from ..models import UserSignup, CourseUnit, UploadedFile
from .serializers import UserSerializer, SignupSerializer, CourseUnitSerializer, UploadedFileSerializer
from django.core.files.storage import default_storage


class SignupView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({'success': True, 'user': UserSerializer(user).data}, status=status.HTTP_201_CREATED)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    @method_decorator(ensure_csrf_cookie)
    def post(self, request):
        # We keep simple session auth for now (existing site behavior)
        email = request.data.get('email')
        password = request.data.get('password')
        role = request.data.get('role')

        if not email or not password or not role:
            return Response({'success': False, 'error': 'email, password and role are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = UserSignup.objects.get(email=email, role=role)
        except UserSignup.DoesNotExist:
            return Response({'success': False, 'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if user.check_password(password):
            # Set session values
            request.session['user_id'] = user.id
            request.session['user_name'] = user.full_name
            request.session['user_email'] = user.email
            request.session['user_role'] = user.role
            return Response({'success': True, 'user': UserSerializer(user).data})
        return Response({'success': False, 'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


class LogoutView(APIView):
    def post(self, request):
        request.session.flush()
        return Response({'success': True})


class MeView(APIView):
    def get(self, request):
        user_id = request.session.get('user_id')
        print(f"DEBUG: MeView - user_id from session: {user_id}")  # Debug logging
        print(f"DEBUG: MeView - all session keys: {list(request.session.keys())}")  # Debug logging

        if not user_id:
            print("DEBUG: MeView - No user_id in session, returning None")  # Debug logging
            return Response({'user': None, 'error': 'No user session found'})

        try:
            user = get_object_or_404(UserSignup, id=user_id)
            print(f"DEBUG: MeView - Found user: {user.full_name} ({user.email})")  # Debug logging
            return Response({'user': UserSerializer(user).data})
        except Exception as e:
            print(f"DEBUG: MeView - Error retrieving user: {str(e)}")  # Debug logging
            return Response({'user': None, 'error': f'Error retrieving user: {str(e)}'})


from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator


class CsrfTokenView(APIView):
    """Return a response that sets the CSRF cookie so the SPA can read it."""
    permission_classes = [permissions.AllowAny]

    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        return Response({'csrf': 'set'})


class TeachersListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        teachers = UserSignup.objects.filter(role='teacher').prefetch_related('course_units__files')
        data = []
        for t in teachers:
            units = CourseUnit.objects.filter(teacher=t).prefetch_related('files')
            serializer = CourseUnitSerializer(units, many=True)
            data.append({'teacher': UserSerializer(t).data, 'units': serializer.data})
        return Response({'teachers': data})


class UnitCreateView(APIView):
    def post(self, request):
        user_id = request.session.get('user_id')
        if not user_id or request.session.get('user_role') != 'teacher':
            return Response({'success': False, 'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        name = request.data.get('name')
        if not name:
            return Response({'success': False, 'error': 'Unit name required'}, status=status.HTTP_400_BAD_REQUEST)
        teacher = get_object_or_404(UserSignup, id=user_id)
        if CourseUnit.objects.filter(teacher=teacher, name=name).exists():
            return Response({'success': False, 'error': 'Unit exists'}, status=status.HTTP_400_BAD_REQUEST)
        unit = CourseUnit.objects.create(teacher=teacher, name=name)
        return Response({'success': True, 'unit': CourseUnitSerializer(unit).data})


class UnitUploadView(APIView):
    def post(self, request, unit_id):
        user_id = request.session.get('user_id')
        if not user_id or request.session.get('user_role') != 'teacher':
            return Response({'success': False, 'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        unit = get_object_or_404(CourseUnit, id=unit_id)
        files = request.FILES.getlist('files')
        tag = request.POST.get('tag', 'study_material')
        uploaded = []
        for f in files:
            file_record = UploadedFile.objects.create(
                teacher=unit.teacher,
                unit=unit,
                original_name=f.name,
                file=f,
                file_size=f.size,
                file_type=f.content_type,
                tag=tag,
                is_published=False
            )
            uploaded.append(UploadedFileSerializer(file_record).data)
        return Response({'success': True, 'files': uploaded})


class UnitDeleteView(APIView):
    def delete(self, request, unit_id):
        user_id = request.session.get('user_id')
        if not user_id or request.session.get('user_role') != 'teacher':
            return Response({'success': False, 'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
        teacher = get_object_or_404(UserSignup, id=user_id)
        unit = get_object_or_404(CourseUnit, id=unit_id, teacher=teacher)
        
        # Delete all associated files
        for file in unit.files.all():
            file.delete()  # This will also delete the physical file
        
        unit.delete()
        return Response({'success': True, 'message': 'Unit deleted successfully'})


class FilePublishView(APIView):
    def post(self, request):
        user_id = request.session.get('user_id')
        if not user_id or request.session.get('user_role') != 'teacher':
            return Response({'success': False, 'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
        file_id = request.data.get('file_id')
        is_published = request.data.get('is_published', True)
        
        if not file_id:
            return Response({'success': False, 'error': 'file_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        teacher = get_object_or_404(UserSignup, id=user_id)
        file_record = get_object_or_404(UploadedFile, id=file_id, teacher=teacher)
        
        file_record.is_published = is_published
        file_record.save()
        
        return Response({
            'success': True,
            'file': UploadedFileSerializer(file_record).data
        })


class FileDeleteView(APIView):
    def delete(self, request, file_id):
        user_id = request.session.get('user_id')
        if not user_id or request.session.get('user_role') != 'teacher':
            return Response({'success': False, 'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
        teacher = get_object_or_404(UserSignup, id=user_id)
        file_record = get_object_or_404(UploadedFile, id=file_id, teacher=teacher)
        
        file_record.delete()  # This will also delete the physical file
        return Response({'success': True, 'message': 'File deleted successfully'})
