from django.db import models
from django.contrib.auth.hashers import make_password, check_password
import os

class UserSignup(models.Model):
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('teacher', 'Teacher'),
    ]
    full_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)  # Store hashed password
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    subject = models.CharField(max_length=100, blank=True, null=True)
    agreed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        # Hash password before saving if it's not already hashed
        if not self.password.startswith('pbkdf2_'):
            self.password = make_password(self.password)
        super().save(*args, **kwargs)
    
    def check_password(self, raw_password):
        """Check if the provided password matches the stored hashed password"""
        return check_password(raw_password, self.password)
    
    def __str__(self):
        return f"{self.full_name} - {self.role.capitalize()}"

class CourseUnit(models.Model):
    """Model to store course units/folders created by teachers"""
    teacher = models.ForeignKey(UserSignup, on_delete=models.CASCADE, related_name='course_units')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['teacher', 'name']  # Prevent duplicate unit names per teacher
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.teacher.full_name} - {self.name}"

class UploadedFile(models.Model):
    """Model to store uploaded files"""
    TAG_CHOICES = [
        ('assignment', 'Assignment'),
        ('personal_note', 'Personal Note'),
        ('study_material', 'Study Material'),
        ('question_bank', 'Question Bank'),
    ]

    teacher = models.ForeignKey(UserSignup, on_delete=models.CASCADE, related_name='uploaded_files')
    unit = models.ForeignKey(CourseUnit, on_delete=models.CASCADE, related_name='files')
    original_name = models.CharField(max_length=255)
    file = models.FileField(upload_to='course_files/%Y/%m/%d/')
    file_size = models.BigIntegerField()  # Size in bytes
    file_type = models.CharField(max_length=50)
    tag = models.CharField(max_length=20, choices=TAG_CHOICES, default='study_material')
    is_published = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.original_name} - {self.teacher.full_name}"
    
    def get_file_size_display(self):
        """Convert bytes to human readable format"""
        size = self.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"
    
    def get_file_icon(self):
        """Return appropriate icon based on file type"""
        if 'pdf' in self.file_type.lower():
            return 'fa-file-pdf'
        elif 'word' in self.file_type.lower() or 'document' in self.file_type.lower():
            return 'fa-file-word'
        elif 'powerpoint' in self.file_type.lower() or 'presentation' in self.file_type.lower():
            return 'fa-file-powerpoint'
        elif 'text' in self.file_type.lower():
            return 'fa-file-alt'
        else:
            return 'fa-file'

    def get_file_color(self):
        """Return appropriate color based on file type"""
        if 'pdf' in self.file_type.lower():
            return '#dc3545'  # Red for PDF
        elif 'word' in self.file_type.lower() or 'document' in self.file_type.lower():
            return '#2b579a'  # Blue for Word
        elif 'powerpoint' in self.file_type.lower() or 'presentation' in self.file_type.lower():
            return '#d24726'  # Orange for PowerPoint
        elif 'text' in self.file_type.lower():
            return '#6c757d'  # Gray for text
        else:
            return '#6c757d'

    def can_preview(self):
        """Check if file can be previewed in browser"""
        return 'pdf' in self.file_type.lower()

    def get_preview_url(self):
        """Get URL for file preview"""
        if self.file:
            return f"/api/preview-file/{self.id}/"
        return None
    
    def delete(self, *args, **kwargs):
        # Delete the actual file when model instance is deleted
        if self.file:
            if os.path.isfile(self.file.path):
                os.remove(self.file.path)
        super().delete(*args, **kwargs)

class EmailNotification(models.Model):
    """Model to track email notifications sent to students"""
    teacher = models.ForeignKey(UserSignup, on_delete=models.CASCADE, related_name='sent_notifications')
    student = models.ForeignKey(UserSignup, on_delete=models.CASCADE, related_name='received_notifications')
    unit = models.ForeignKey(CourseUnit, on_delete=models.CASCADE)
    file = models.ForeignKey(UploadedFile, on_delete=models.CASCADE, null=True, blank=True)
    notification_type = models.CharField(max_length=20, choices=[
        ('unit_created', 'Unit Created'),
        ('file_uploaded', 'File Uploaded'),
        ('file_published', 'File Published'),
    ])
    sent_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-sent_at']
    
    def __str__(self):
        return f"Notification to {self.student.full_name} about {self.unit.name}"
