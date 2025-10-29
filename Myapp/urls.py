from django.urls import path
from django.urls import include
from django.conf import settings
from django.conf.urls.static import static
from . import views

urlpatterns = [
    path('', views.login_view, name='login'),
    path('login/', views.login_view, name='login'),
    path('signup/', views.signup_view, name='signup'),
    path('student-dashboard/', views.student_view, name='student_dashboard'),
    path('teacher-dashboard/', views.teacher_view, name='teacher_dashboard'),
    path('logout/', views.logout_view, name='logout'),
    
    # API endpoints
    path('api/create-unit/', views.create_unit, name='create_unit'),
    path('api/upload-file/', views.upload_file, name='upload_file'),
    path('api/publish-files/', views.publish_files, name='publish_files'),
    path('api/download-file/<int:file_id>/', views.download_file, name='download_file'),
    path('api/preview-file/<int:file_id>/', views.preview_file, name='preview_file'),
    path('api/delete-file/<int:file_id>/', views.delete_file, name='delete_file'),
    path('api/delete-unit/<int:unit_id>/', views.delete_unit, name='delete_unit'),
    # New DRF-style API (v1)
    path('api/v1/', include('Myapp.api.urls')),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
