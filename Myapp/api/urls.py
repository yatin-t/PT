from django.urls import path
from . import views

urlpatterns = [
    # Authentication endpoints
    path('auth/signup/', views.SignupView.as_view(), name='api_signup'),
    path('auth/csrf/', views.CsrfTokenView.as_view(), name='api_csrf'),
    path('auth/login/', views.LoginView.as_view(), name='api_login'),
    path('auth/logout/', views.LogoutView.as_view(), name='api_logout'),
    path('auth/me/', views.MeView.as_view(), name='api_me'),

    # Teacher and unit endpoints
    path('teachers/', views.TeachersListView.as_view(), name='api_teachers'),
    path('units/create/', views.UnitCreateView.as_view(), name='api_create_unit'),
    path('units/<int:unit_id>/upload/', views.UnitUploadView.as_view(), name='api_unit_upload'),
    path('units/<int:unit_id>/', views.UnitDeleteView.as_view(), name='api_delete_unit'),
    
    # File endpoints
    path('files/publish/', views.FilePublishView.as_view(), name='api_publish_file'),
    path('files/<int:file_id>/', views.FileDeleteView.as_view(), name='api_delete_file'),
]
