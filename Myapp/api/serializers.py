from rest_framework import serializers
from ..models import UserSignup, CourseUnit, UploadedFile


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSignup
        fields = ['id', 'full_name', 'email', 'role', 'subject']


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = UserSignup
        fields = ['id', 'full_name', 'email', 'password', 'role', 'subject', 'agreed']

    def create(self, validated_data):
        # Use model's save to hash password
        user = UserSignup(**validated_data)
        user.save()
        return user


class UploadedFileSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    get_file_size_display = serializers.SerializerMethodField()

    class Meta:
        model = UploadedFile
        fields = ['id', 'original_name', 'file_size', 'file_type', 'tag', 'is_published', 'uploaded_at', 'file_url', 'get_file_size_display']

    def get_file_url(self, obj):
        """Get the Cloudinary URL for direct download"""
        if obj.file:
            return obj.file.url
        return None

    def get_file_size_display(self, obj):
        """Format file size for display"""
        return obj.get_file_size_display()


class CourseUnitSerializer(serializers.ModelSerializer):
    files = UploadedFileSerializer(many=True, read_only=True)
    teacher = UserSerializer(read_only=True)

    class Meta:
        model = CourseUnit
        fields = ['id', 'name', 'description', 'created_at', 'updated_at', 'teacher', 'files']
