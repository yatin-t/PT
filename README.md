# cloudED - Modern Learning Management Platform

A full-stack web application built with **Django REST Framework** (backend) and **React** (frontend) that enables teachers to organize course materials and students to access them in a clean, intuitive interface.

## 🎯 Features

### For Teachers
- 📁 **Unit Management** - Create and organize course units
- 📤 **File Upload** - Upload multiple files with categorization (Study Material, Assignment, Personal Note, Question Bank)
- 👁️ **Publish Control** - Control file visibility to students
- 📊 **Dashboard** - View stats on units and uploaded files
- 🔐 **Secure Access** - Session-based authentication

### For Students
- 📚 **Browse Materials** - View all published materials from teachers
- 🔍 **Advanced Filtering** - Filter by teacher, subject, unit, or tag
- 📥 **Download Files** - Access course materials anytime
- 👤 **Profile Management** - View personal information

### Technical Features
- ✅ Session-based authentication (secure & reliable)
- 🔄 Real-time UI updates
- 📱 Responsive design
- 🛡️ CSRF protection (exempted for teacher endpoints)
- 🌐 CORS configured for development
- 🎨 Modern, clean UI with Font Awesome icons
- ⚡ Fast development with Vite HMR
- 🔒 File validation (type & size limits)
- 📊 Real-time statistics on dashboard

## 🏗️ Architecture

```
cloudED/
├── backend (Django)
│   ├── Myapp/              # Main Django app
│   │   ├── models.py       # UserSignup, CourseUnit, UploadedFile
│   │   ├── views.py        # Traditional views
│   │   ├── api/            # REST API
│   │   │   ├── views.py    # API endpoints
│   │   │   ├── serializers.py
│   │   │   └── urls.py
│   │   └── templates/      # Django templates (legacy)
│   └── Project/            # Django settings
│
└── frontend (React + Vite)
    ├── src/
    │   ├── pages/          # Login, Signup, Dashboards
    │   ├── components/     # Reusable components
    │   ├── contexts/       # AuthContext
    │   ├── css/            # Stylesheets
    │   └── api.js          # Axios instance
    └── vite.config.js      # Vite dev server proxy
```

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. **Navigate to project directory**
   ```powershell
   cd PT-version-20
   ```

2. **Activate virtual environment**
   ```powershell
   .\env\Scripts\Activate.ps1
   ```

3. **Install dependencies** (already installed if using existing env)
   ```powershell
   pip install -r requirements.txt
   ```

4. **Run migrations**
   ```powershell
   python manage.py migrate
   ```

5. **Start Django dev server**
   ```powershell
   python manage.py runserver 0.0.0.0:8000
   ```

   Server will be available at: `http://127.0.0.1:8000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```powershell
   cd frontend
   ```

2. **Install dependencies**
   ```powershell
   npm install
   ```

3. **Start Vite dev server**
   ```powershell
   npm run dev
   ```

   Frontend will be available at: `http://localhost:5173` (or `:5174` if 5173 is taken)

## 📡 API Endpoints

### Authentication
- `POST /api/v1/auth/signup/` - Create new user account
- `POST /api/v1/auth/login/` - Login (sets session cookie)
- `POST /api/v1/auth/logout/` - Logout
- `GET /api/v1/auth/me/` - Get current user info
- `GET /api/v1/auth/csrf/` - Get CSRF token

### Teachers
- `GET /api/v1/teachers/` - List all teachers with units and files
- `POST /api/create-unit/` - Create a new unit (teacher only) 🔥 **CSRF EXEMPT**
- `POST /api/upload-file/` - Upload multiple files to unit (teacher only) 🔥 **CSRF EXEMPT**
- `POST /api/publish-files/` - Publish all unpublished files in unit 🔥 **CSRF EXEMPT**
- `DELETE /api/delete-file/<id>/` - Delete specific file 🔥 **CSRF EXEMPT**
- `DELETE /api/delete-unit/<id>/` - Delete unit and all its files 🔥 **CSRF EXEMPT**
- `GET /api/download-file/<id>/` - Download file
- `GET /api/preview-file/<id>/` - Preview file in browser

## 🔐 Authentication Flow

1. **Signup**: User creates account with role (student/teacher)
2. **Login**: User authenticates → Server sets session cookie
3. **Auth Check**: Frontend calls `/api/v1/auth/me/` to get user info
4. **Protected Routes**: `ProtectedRoute` component guards dashboards
5. **Logout**: Clear session and redirect to login

## 🛠️ Development Details

### Frontend Technologies
- **React 18.2** - UI library
- **React Router 6.20** - Client-side routing
- **Axios 1.4** - HTTP client with interceptors
- **Vite 5.2** - Build tool and dev server
- **Context API** - State management (AuthContext)

### Backend Technologies
- **Django 5.2.4** - Web framework
- **Django REST Framework 3.16** - API framework
- **django-cors-headers 4.0** - CORS middleware
- **SQLite** - Database (development)

### Key Configuration

**Vite Proxy** (`frontend/vite.config.js`):
```javascript
proxy: {
  '/api': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
  },
}
```
This forwards all `/api` requests to Django during development, avoiding CORS issues.

**Django CORS** (`Project/settings.py`):
```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
]
CORS_ALLOW_CREDENTIALS = True
```

## 📝 Database Models

### UserSignup
- `full_name`, `email`, `password` (hashed)
- `role` - 'student' or 'teacher'
- `subject` - Teacher's subject (optional)
- `agreed` - Terms acceptance

### CourseUnit
- `teacher` - ForeignKey to UserSignup
- `name` - Unit name
- `description` - Optional description
- Unique constraint: (teacher, name)

### UploadedFile
- `teacher`, `unit` - Foreign keys
- `original_name`, `file`, `file_size`, `file_type`
- `tag` - assignment | personal_note | study_material | question_bank
- `is_published` - Visibility to students

### EmailNotification
- Tracks notifications sent to students
- Types: unit_created, file_uploaded, file_published

## 🎨 UI/UX Features

- **Loading States** - Spinners during async operations
- **Error Handling** - User-friendly error messages
- **Success Feedback** - Toast-style success notifications
- **Responsive Design** - Works on desktop and mobile
- **Icon Library** - Font Awesome icons throughout
- **Consistent Theming** - Purple/blue color scheme (#7f65f3)

## 🧪 Testing Workflow

### Test as Teacher
1. **Signup** as a teacher with subject "Mathematics"
2. **Login** as the teacher → Dashboard appears
3. **Create** a unit: Click "Create New Unit" → Enter "Algebra Basics" → Submit
4. **Upload** files: Click on unit → Select files → Choose tag → Upload
5. **Publish**: Click "Publish All" to make files visible to students
6. **Manage**: Download to verify, or delete files/units as needed
7. **Statistics**: View total units and files in sidebar

### Test as Student
1. **Signup** as a student (no subject needed)
2. **Login** as student → Dashboard shows all published materials
3. **Browse**: See all teachers, subjects, and units
4. **Filter**: Use dropdowns to filter by teacher, subject, tag, or unit
5. **Search**: Use search bar for quick lookup
6. **Download**: Click download button on any published file
7. **Verify**: Open downloaded files to confirm they work

### Quick Test Data
- Teacher: `teacher@test.com` / `password123` / Subject: "Computer Science"
- Student: `student@test.com` / `password123`
- Unit: "Introduction to Programming"
- Files: Upload PDF notes, DOCX assignments, PPTX presentations

## 🔧 Troubleshooting

### Issue: "Failed to load resource: 404"
- **Solution**: Ensure both backend and frontend servers are running
- Django should be on `http://127.0.0.1:8000`
- React should be on `http://localhost:5173`
- Check Vite proxy configuration in `vite.config.js`
- Verify API endpoints use relative paths (`../create-unit/` not `/api/v1/create-unit/`)

### Issue: "Can't create unit or upload files"
- **Solution**: Already fixed! Teacher endpoints now have `@csrf_exempt`
- Check browser console for errors (F12 → Console)
- Check Django terminal for incoming requests
- Verify you're logged in as a teacher
- Ensure FormData is being sent correctly

### Issue: "User data not available"
- **Solution**: Check browser DevTools → Application → Cookies
- Ensure `sessionid` cookie is set after login
- Verify `withCredentials: true` in `api.js`
- Check `/api/v1/auth/me/` returns user data

### Issue: "CORS error"
- **Solution**: Add your frontend port to `CORS_ALLOWED_ORIGINS` in Django settings
- Default ports (5173, 5174) are already configured
- Restart Django server after changing settings
- Check `CORS_ALLOW_CREDENTIALS = True` is set

### Issue: "Files not uploading"
- **Solution**: Check file size (max 50MB per file)
- Verify file type (PDF, DOCX, PPTX, TXT only)
- Ensure `unit_id` is being sent in FormData
- Check Django logs for validation errors

### Issue: "Published files not visible to students"
- **Solution**: Click "Publish All" button after uploading
- Check `is_published` field in database
- Verify `/api/v1/teachers/` endpoint returns files
- Filter might be hiding files (reset filters)

### Development Tips
- **Check Django logs**: Watch terminal for request logs and errors
- **Check Browser DevTools**: Console for JS errors, Network for API calls
- **Check Database**: Use `python manage.py dbshell` to query directly
- **Reset Database**: Delete `db.sqlite3` and run `python manage.py migrate`

## 📦 Deployment Considerations

### Production Checklist
- [ ] Set `DEBUG = False` in Django settings
- [ ] Configure proper `SECRET_KEY`
- [ ] Use PostgreSQL or MySQL instead of SQLite
- [ ] Set up static file serving (`collectstatic`)
- [ ] Build React frontend (`npm run build`)
- [ ] Configure Django to serve React build
- [ ] Set up proper CORS origins (production domain)
- [ ] Enable HTTPS
- [ ] Set up environment variables
- [ ] Configure email backend for notifications
- [ ] Add rate limiting
- [ ] Set up monitoring and logging

### Recommended Stack
- **Frontend**: Vercel or Netlify
- **Backend**: Heroku, Railway, or AWS EC2
- **Database**: PostgreSQL (RDS, Supabase, or Neon)
- **Media Files**: AWS S3 or Cloudinary
- **SSL**: Let's Encrypt

## 🤝 Contributing

This is a learning management platform designed for educational use. Feel free to fork and customize for your needs.

## 📄 License

This project is for educational purposes.

## 👥 Authors

**cloudED Team**

---

## 🎯 Current Status (Latest Update)

### ✅ **FULLY WORKING**
- ✅ Teacher signup and login
- ✅ Student signup and login  
- ✅ **Create new units** - Fixed API routing
- ✅ **Upload multiple files** - FormData with CSRF exempt
- ✅ **Publish files** - Bulk publish functionality
- ✅ **Delete files** - Individual file deletion
- ✅ **Delete units** - Cascade delete with confirmation
- ✅ **Download files** - Working correctly
- ✅ **Filter materials** - Advanced student filtering
- ✅ **Statistics** - Real-time unit and file counts
- ✅ Both servers running and communicating

### 🔥 Recent Fixes
- Fixed API endpoint routing (relative paths: `../create-unit/` instead of `/api/v1/create-unit/`)
- Added `@csrf_exempt` to all teacher endpoints (create, upload, publish, delete)
- Corrected FormData structure for multipart uploads
- Comprehensive documentation created (SETUP-GUIDE.md, WORKING-FEATURES.md)

### 📚 Documentation
- **[SETUP-GUIDE.md](SETUP-GUIDE.md)** - Complete setup and usage guide
- **[WORKING-FEATURES.md](WORKING-FEATURES.md)** - Feature checklist and status
- **[QUICKSTART.md](QUICKSTART.md)** - Quick testing guide (if available)

### 🚀 Ready to Use
Both servers are running and the application is fully functional. Test the teacher dashboard to:
1. Create course units
2. Upload and categorize files
3. Publish content to students
4. Manage all materials

---

**Note**: This application uses session-based authentication. For a production app handling sensitive data, consider switching to JWT tokens and implementing additional security measures (2FA, rate limiting, input validation, etc.).
