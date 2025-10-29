from django import forms
from django.contrib.auth.hashers import make_password
from .models import UserSignup

class SignupForm(forms.ModelForm):
    confirm_password = forms.CharField(
        widget=forms.PasswordInput(attrs={'placeholder': 'Confirm Password'}),
        label='Confirm Password'
    )
    
    class Meta:
        model = UserSignup
        fields = ['full_name', 'email', 'password', 'role', 'subject', 'agreed']
        widgets = {
            'full_name': forms.TextInput(attrs={'placeholder': 'Full Name', 'required': True}),
            'email': forms.EmailInput(attrs={'placeholder': 'Email Address', 'required': True}),
            'password': forms.PasswordInput(attrs={'placeholder': 'Password', 'required': True}),
            'role': forms.Select(attrs={'id': 'roleSelect', 'required': True}),
            'subject': forms.TextInput(attrs={'placeholder': 'Subject(s) You Want to Teach'}),
            'agreed': forms.CheckboxInput(attrs={'required': True}),
        }
    
    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        confirm_password = cleaned_data.get('confirm_password')
        
        if password and confirm_password and password != confirm_password:
            self.add_error('confirm_password', "Passwords do not match.")
        
        return cleaned_data
    
    def save(self, commit=True):
        user = super().save(commit=False)
        # Password will be hashed in the model's save method
        if commit:
            user.save()
        return user

ROLE_CHOICES = (
    ('student', 'Student'),
    ('teacher', 'Teacher'),
)

class LoginForm(forms.Form):
    email = forms.EmailField(
        label="Email Address", 
        max_length=100, 
        widget=forms.EmailInput(attrs={
            'placeholder': 'Email Address',
            'required': True,
        })
    )
    
    password = forms.CharField(
        label="Password", 
        max_length=100, 
        widget=forms.PasswordInput(attrs={
            'placeholder': 'Password',
            'required': True,
        })
    )
    
    role = forms.ChoiceField(
        choices=ROLE_CHOICES, 
        widget=forms.RadioSelect, 
        label="Role"
    )
