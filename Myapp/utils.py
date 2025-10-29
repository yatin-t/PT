from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from .models import UserSignup, EmailNotification
import logging

logger = logging.getLogger(__name__)

def send_notification_email(teacher, unit, notification_type, file=None):
    """Send email notifications to all students when teacher uploads content"""
    try:
        # Get all students
        students = UserSignup.objects.filter(role='student')
        
        if not students.exists():
            logger.info("No students found to notify")
            return
        
        # Prepare email content based on notification type
        if notification_type == 'unit_created':
            subject = f"New Course Unit Created: {unit.name}"
            message = f"""
Hello!

{teacher.full_name} has created a new course unit for {teacher.subject}:

Unit: {unit.name}
Teacher: {teacher.full_name}
Subject: {teacher.subject}

Log in to cloudED to explore the new content!

Best regards,
cloudED Team
            """
        elif notification_type == 'file_uploaded':
            subject = f"New File Uploaded: {file.original_name}"
            message = f"""
Hello!

{teacher.full_name} has uploaded a new file to {teacher.subject}:

File: {file.original_name}
Unit: {unit.name}
Teacher: {teacher.full_name}
Subject: {teacher.subject}
File Size: {file.get_file_size_display()}

Log in to cloudED to download and view the file!

Best regards,
cloudED Team
            """
        elif notification_type == 'file_published':
            subject = f"File Published: {file.original_name}"
            message = f"""
Hello!

{teacher.full_name} has published a file in {teacher.subject}:

File: {file.original_name}
Unit: {unit.name}
Teacher: {teacher.full_name}
Subject: {teacher.subject}

The file is now available for download!

Best regards,
cloudED Team
            """
        
        # Send email to each student
        student_emails = [student.email for student in students]
        
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=student_emails,
                fail_silently=False,
            )
            
            # Create notification records
            for student in students:
                EmailNotification.objects.create(
                    teacher=teacher,
                    student=student,
                    unit=unit,
                    file=file,
                    notification_type=notification_type
                )
            
            logger.info(f"Email notifications sent to {len(student_emails)} students")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email notifications: {str(e)}")
            return False
            
    except Exception as e:
        logger.error(f"Error in send_notification_email: {str(e)}")
        return False

def format_file_size(size_bytes):
    """Convert bytes to human readable format"""
    if size_bytes == 0:
        return "0 B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    import math
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {size_names[i]}"
