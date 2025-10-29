from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth import login as auth_login
from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import json
import os
import mimetypes
from .forms import SignupForm, LoginForm
from .models import UserSignup, CourseUnit, UploadedFile, EmailNotification
from .utils import send_notification_email, format_file_size

def login_view(request):
    if request.method == "POST":
        form = LoginForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email']
            password = form.cleaned_data['password']
            role = form.cleaned_data['role']
            
            try:
                # Check if user exists with the given email and role
                user = UserSignup.objects.get(email=email, role=role)
                
                # Check if password matches
                if user.check_password(password):
                    # Store user info in session for later use
                    request.session['user_id'] = user.id
                    request.session['user_name'] = user.full_name
                    request.session['user_email'] = user.email
                    request.session['user_role'] = user.role
                    request.session['user_subject'] = user.subject if user.subject else 'General Course'
                    
                    messages.success(request, f"Welcome back, {user.full_name}!")
                    
                    # Redirect based on role
                    if role == 'teacher':
                        return redirect('teacher_dashboard')
                    else:
                        return redirect('student_dashboard')
                else:
                    messages.error(request, "Incorrect password. Please try again.")
                    
            except UserSignup.DoesNotExist:
                messages.error(request, f"No {role} account found with email '{email}'. Please sign up first.")
        else:
            messages.error(request, "Please fill in all required fields correctly.")
    else:
        form = LoginForm()
    
    return render(request, 'login.html', {'form': form})

def signup_view(request):
    if request.method == 'POST':
        form = SignupForm(request.POST)
        if form.is_valid():
            try:
                email = form.cleaned_data['email']
                full_name = form.cleaned_data['full_name']
                
                # Check if user already exists with same email
                existing_user = UserSignup.objects.filter(email=email).first()
                if existing_user:
                    messages.error(request, f"An account with email '{email}' already exists. Please use a different email or try logging in.")
                    return render(request, 'signup.html', {'form': form})
                
                # Save the new user
                user = form.save()
                messages.success(request, f"Account created successfully for {user.full_name}! Please log in with your credentials.")
                return redirect('login')
                
            except Exception as e:
                messages.error(request, "An error occurred while creating your account. Please try again.")
                print(f"Signup error: {e}")  # For debugging
        else:
            # Handle form validation errors
            error_messages = []
            
            if 'email' in form.errors:
                error_messages.append("Please enter a valid email address.")
            if 'password' in form.errors:
                error_messages.append("Password requirements not met.")
            if 'confirm_password' in form.errors:
                error_messages.append("Passwords do not match.")
            if 'agreed' in form.errors:
                error_messages.append("You must agree to the Terms of Use and Privacy Policy.")
            if 'full_name' in form.errors:
                error_messages.append("Please enter a valid full name.")
            
            for error_msg in error_messages:
                messages.error(request, error_msg)
            
            if not error_messages:
                messages.error(request, "Please correct the errors below and try again.")
    else:
        form = SignupForm()
    
    return render(request, 'signup.html', {'form': form})

def student_view(request):
    # Check if user is logged in and has student role
    if 'user_id' not in request.session:
        messages.error(request, "Please log in to access the dashboard.")
        return redirect('login')
    
    if request.session.get('user_role') != 'student':
        messages.error(request, "Access denied. Student access required.")
        return redirect('login')
    
    # Get fresh user data from database
    try:
        user = UserSignup.objects.get(id=request.session['user_id'])
        
        # Get all teachers with their units and published files only
        teachers = UserSignup.objects.filter(role='teacher').prefetch_related(
            'course_units__files'
        ).order_by('full_name')
        
        # Filter to only show teachers who have published content
        teachers_with_content = []
        for teacher in teachers:
            # Check if teacher has any published files
            has_published_files = any(
                unit.files.filter(is_published=True).exists() 
                for unit in teacher.course_units.all()
            )
            if teacher.course_units.exists() or has_published_files:
                teachers_with_content.append(teacher)
        
        # Get recent notifications for this student
        recent_notifications = EmailNotification.objects.filter(
            student=user
        ).select_related('teacher', 'unit', 'file').order_by('-sent_at')[:10]
        
        context = {
            'user_name': user.full_name,
            'user_email': user.email,
            'user_subject': user.subject if user.subject else 'General Course',
            'teachers': teachers_with_content,
            'recent_notifications': recent_notifications,
        }
    except UserSignup.DoesNotExist:
        messages.error(request, "User account not found. Please log in again.")
        return redirect('login')
    
    return render(request, 'studentdashboard.html', context)

def teacher_view(request):
    # Check if user is logged in and has teacher role
    if 'user_id' not in request.session:
        messages.error(request, "Please log in to access the dashboard.")
        return redirect('login')
    
    if request.session.get('user_role') != 'teacher':
        messages.error(request, "Access denied. Teacher access required.")
        return redirect('login')
    
    # Get fresh user data from database
    try:
        user = UserSignup.objects.get(id=request.session['user_id'])
        
        # Get teacher's units and files
        units = CourseUnit.objects.filter(teacher=user).prefetch_related('files').order_by('created_at')
        
        context = {
            'user_name': user.full_name,
            'user_email': user.email,
            'user_subject': user.subject if user.subject else 'General Course',
            'user_role': user.role,
            'units': units,
        }
    except UserSignup.DoesNotExist:
        messages.error(request, "User account not found. Please log in again.")
        return redirect('login')
    
    return render(request, 'teacherdashboard.html', context)

@csrf_exempt
@require_http_methods(["POST"])
def create_unit(request):
    """Create a new course unit"""
    # Debug print
    print(f"Session data: {dict(request.session)}")
    print(f"POST data: {request.POST}")
    print(f"Request body: {request.body}")
    
    if 'user_id' not in request.session or request.session.get('user_role') != 'teacher':
        print("Authorization failed - session check")
        return JsonResponse({'success': False, 'error': 'Unauthorized - Please log in as teacher'})
    
    try:
        # Handle both JSON and form data
        if request.content_type == 'application/json':
            data = json.loads(request.body)
            unit_name = data.get('name', '').strip()
        else:
            unit_name = request.POST.get('name', '').strip()
        
        if not unit_name:
            return JsonResponse({'success': False, 'error': 'Unit name is required'})
        
        teacher = UserSignup.objects.get(id=request.session['user_id'])
        
        # Check if unit already exists
        if CourseUnit.objects.filter(teacher=teacher, name=unit_name).exists():
            return JsonResponse({'success': False, 'error': 'Unit with this name already exists'})
        
        # Create the unit
        unit = CourseUnit.objects.create(
            teacher=teacher,
            name=unit_name
        )
        
        # Email notification disabled
        # try:
        #     send_notification_email(teacher, unit, 'unit_created')
        # except Exception as e:
        #     print(f"Email notification failed: {e}")
        
        return JsonResponse({
            'success': True,
            'unit': {
                'id': unit.id,
                'name': unit.name,
                'created_at': unit.created_at.strftime('%Y-%m-%d %H:%M')
            }
        })
        
    except UserSignup.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Teacher not found'})
    except Exception as e:
        print(f"Error creating unit: {e}")
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@require_http_methods(["POST"])
def upload_file(request):
    """Handle file upload to a specific unit"""
    # Debug print
    print(f"=== UPLOAD REQUEST DEBUG ===")
    print(f"Session data: {dict(request.session)}")
    print(f"Content-Type: {request.content_type}")
    print(f"Method: {request.method}")
    print(f"POST data: {dict(request.POST)}")
    print(f"POST data items: {list(request.POST.items())}")
    print(f"FILES data: {request.FILES}")
    print(f"All FILES keys: {list(request.FILES.keys())}")
    
    if 'user_id' not in request.session or request.session.get('user_role') != 'teacher':
        print("Authorization failed - session check")
        return JsonResponse({'success': False, 'error': 'Unauthorized - Please log in as teacher'})
    
    try:
        # Try to get unit_id from POST
        unit_id = request.POST.get('unit_id')
        print(f"Unit ID from POST.get('unit_id'): {unit_id}")
        
        # Fallback: Try different ways to get unit_id
        if not unit_id:
            unit_id = request.POST.get('unit_id[]')
            print(f"Trying unit_id[]: {unit_id}")
        if not unit_id and 'unit_id' in request.POST:
            unit_id = request.POST['unit_id']
            print(f"Trying POST['unit_id']: {unit_id}")
        
        uploaded_files = request.FILES.getlist('files')
        print(f"Files from getlist('files'): {[f.name for f in uploaded_files]}")
        
        # Try different keys if 'files' doesn't work
        if not uploaded_files:
            for key in request.FILES.keys():
                print(f"Trying key: {key}")
                uploaded_files = request.FILES.getlist(key)
                if uploaded_files:
                    print(f"Found files under key '{key}': {[f.name for f in uploaded_files]}")
                    break
        
        if not unit_id:
            print(f"ERROR: Unit ID not found in POST data: {dict(request.POST)}")
            return JsonResponse({'success': False, 'error': 'Unit ID is required. Received POST data: ' + str(dict(request.POST))})
        
        if not uploaded_files:
            return JsonResponse({'success': False, 'error': 'No files found in request. FILES keys: ' + str(list(request.FILES.keys()))})
        
        teacher = UserSignup.objects.get(id=request.session['user_id'])
        unit = get_object_or_404(CourseUnit, id=unit_id, teacher=teacher)
        
        uploaded_file_data = []
        
        # Define allowed file types
        ALLOWED_FILE_TYPES = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
        ]
        
        MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
        
        # Get tag from POST data (default to study_material if not provided)
        tag = request.POST.get('tag', 'study_material')
        
        skipped_files = []  # Track skipped files

        for uploaded_file in uploaded_files:
            print(f"Processing file: {uploaded_file.name}, size: {uploaded_file.size}, type: {uploaded_file.content_type}")

            # Validate file type
            if uploaded_file.content_type not in ALLOWED_FILE_TYPES:
                print(f"❌ File type not allowed: {uploaded_file.content_type}")
                skipped_files.append({
                    'name': uploaded_file.name,
                    'reason': f'File type not allowed: {uploaded_file.content_type}. Allowed types: PDF, DOCX, PPTX, TXT'
                })
                continue

            # Validate file size
            if uploaded_file.size > MAX_FILE_SIZE:
                print(f"❌ File too large: {uploaded_file.size}")
                skipped_files.append({
                    'name': uploaded_file.name,
                    'reason': f'File too large: {uploaded_file.size / (1024*1024):.1f}MB (max: 50MB)'
                })
                continue

            print(f"✅ File validation passed, creating record...")
            
            # Create file record
            file_record = UploadedFile.objects.create(
                teacher=teacher,
                unit=unit,
                original_name=uploaded_file.name,
                file=uploaded_file,
                file_size=uploaded_file.size,
                file_type=uploaded_file.content_type,
                tag=tag,
                is_published=False  # Files start as drafts
            )
            
            uploaded_file_data.append({
                'id': file_record.id,
                'name': file_record.original_name,
                'size': file_record.get_file_size_display(),
                'uploaded_at': file_record.uploaded_at.strftime('%Y-%m-%d %H:%M')
            })
            
            # Email notification disabled
            # try:
            #     send_notification_email(teacher, unit, 'file_uploaded', file_record)
            # except Exception as e:
            #     print(f"Email notification failed: {e}")
        
        # Prepare response
        response_data = {
            'success': True,
            'files': uploaded_file_data,
            'message': f'{len(uploaded_file_data)} file(s) uploaded successfully'
        }
        
        # Add warning if files were skipped
        if skipped_files:
            response_data['skipped_files'] = skipped_files
            response_data['warning'] = f'{len(skipped_files)} file(s) were skipped'
        
        return JsonResponse(response_data)
        
    except UserSignup.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Teacher not found'})
    except Exception as e:
        print(f"Error uploading files: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@require_http_methods(["POST"])
def publish_files(request):
    """Publish files in a unit"""
    if 'user_id' not in request.session or request.session.get('user_role') != 'teacher':
        return JsonResponse({'success': False, 'error': 'Unauthorized - Please log in as teacher'})
    
    try:
        # Handle both JSON and form data
        if request.content_type == 'application/json':
            data = json.loads(request.body)
            unit_id = data.get('unit_id')
        else:
            unit_id = request.POST.get('unit_id')
        
        teacher = UserSignup.objects.get(id=request.session['user_id'])
        unit = get_object_or_404(CourseUnit, id=unit_id, teacher=teacher)
        
        # Publish all unpublished files in the unit
        unpublished_files = UploadedFile.objects.filter(unit=unit, is_published=False)
        
        for file_record in unpublished_files:
            file_record.is_published = True
            file_record.save()
            
            # Email notification disabled
            # try:
            #     send_notification_email(teacher, unit, 'file_published', file_record)
            # except Exception as e:
            #     print(f"Email notification failed: {e}")
        
        return JsonResponse({
            'success': True,
            'message': f'{unpublished_files.count()} file(s) published successfully'
        })
        
    except UserSignup.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Teacher not found'})
    except Exception as e:
        print(f"Error publishing files: {e}")
        return JsonResponse({'success': False, 'error': str(e)})

@require_http_methods(["GET"])
def download_file(request, file_id):
    """Download a file"""
    try:
        # Students can download published files, teachers can download their own files
        if 'user_id' not in request.session:
            raise Http404("File not found")
        
        user = UserSignup.objects.get(id=request.session['user_id'])
        file_record = get_object_or_404(UploadedFile, id=file_id)
        
        # Check permissions
        if user.role == 'student' and not file_record.is_published:
            raise Http404("File not found")
        elif user.role == 'teacher' and file_record.teacher != user:
            raise Http404("File not found")
        
        # For Cloudinary files, redirect to the cloud URL
        # Cloudinary URLs are already public and don't need to be served through Django
        if file_record.file:
            file_url = file_record.file.url
            print(f"Redirecting to file URL: {file_url}")
            # Redirect to Cloudinary URL directly
            from django.shortcuts import redirect
            return redirect(file_url)
        else:
            raise Http404("File not found")
            
    except Exception as e:
        print(f"Download error: {e}")
        import traceback
        traceback.print_exc()
        raise Http404("File not found")

@require_http_methods(["GET"])
def preview_file(request, file_id):
    """Preview a file in browser"""
    try:
        # Students can preview published files, teachers can preview their own files
        if 'user_id' not in request.session:
            raise Http404("File not found")
        
        user = UserSignup.objects.get(id=request.session['user_id'])
        file_record = get_object_or_404(UploadedFile, id=file_id)
        
        # Check permissions
        if user.role == 'student' and not file_record.is_published:
            raise Http404("File not found")
        elif user.role == 'teacher' and file_record.teacher != user:
            raise Http404("File not found")
        
        # For Cloudinary files, redirect to the cloud URL
        if file_record.file:
            file_url = file_record.file.url
            print(f"Redirecting to preview URL: {file_url}")
            from django.shortcuts import redirect
            return redirect(file_url)
        else:
            raise Http404("File not found")
            
    except Exception as e:
        print(f"Preview error: {e}")
        import traceback
        traceback.print_exc()
        raise Http404("File not found")

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_file(request, file_id):
    """Delete a file (teachers only)"""
    if 'user_id' not in request.session or request.session.get('user_role') != 'teacher':
        return JsonResponse({'success': False, 'error': 'Unauthorized'})
    
    try:
        teacher = UserSignup.objects.get(id=request.session['user_id'])
        file_record = get_object_or_404(UploadedFile, id=file_id, teacher=teacher)
        
        file_name = file_record.original_name
        file_record.delete()  # This will also delete the actual file
        
        return JsonResponse({
            'success': True,
            'message': f'File "{file_name}" deleted successfully'
        })
        
    except UserSignup.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Teacher not found'})
    except Exception as e:
        print(f"Error deleting file: {e}")
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_unit(request, unit_id):
    """Delete a unit and all its files (teachers only)"""
    if 'user_id' not in request.session or request.session.get('user_role') != 'teacher':
        return JsonResponse({'success': False, 'error': 'Unauthorized'})
    
    try:
        teacher = UserSignup.objects.get(id=request.session['user_id'])
        unit = get_object_or_404(CourseUnit, id=unit_id, teacher=teacher)
        
        unit_name = unit.name
        unit.delete()  # This will cascade delete all files
        
        return JsonResponse({
            'success': True,
            'message': f'Unit "{unit_name}" deleted successfully'
        })
        
    except UserSignup.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Teacher not found'})
    except Exception as e:
        print(f"Error deleting unit: {e}")
        return JsonResponse({'success': False, 'error': str(e)})

def logout_view(request):
    # Clear session data
    request.session.flush()
    messages.success(request, "You have been logged out successfully.")
    return redirect('login')
