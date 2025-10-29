from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import UserSignup, CourseUnit, UploadedFile, EmailNotification

class UserSignupAdmin(admin.ModelAdmin):
    """Custom admin for UserSignup model"""
    list_display = ('full_name', 'email', 'role', 'subject', 'agreed', 'created_at')
    list_filter = ('role', 'agreed', 'created_at')
    search_fields = ('full_name', 'email', 'subject')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'password')  # Make password readonly for security
    
    fieldsets = (
        ('Personal Information', {
            'fields': ('full_name', 'email', 'role', 'subject')
        }),
        ('Account Settings', {
            'fields': ('agreed', 'password')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        """Make email readonly when editing existing users"""
        if obj:  # Editing an existing object
            return self.readonly_fields + ('email',)
        return self.readonly_fields

# Register only UserSignup for now
admin.site.register(UserSignup, UserSignupAdmin)

# Customize admin site headers
admin.site.site_header = "cloudED Administration"
admin.site.site_title = "cloudED Admin"
admin.site.index_title = "Welcome to cloudED Administration"
admin.site.register(UploadedFile)

admin.site.register(CourseUnit)