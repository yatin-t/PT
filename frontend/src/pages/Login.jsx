import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import '../css/login.css'
import '../css/auth.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const navigate = useNavigate()
  const { login, user, loading } = useAuth()

  useEffect(() => {
    document.body.classList.add('auth-bg')
    return () => document.body.classList.remove('auth-bg')
  }, [])

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      if (user.role === 'student') {
        navigate('/student', { replace: true })
      } else if (user.role === 'teacher') {
        navigate('/teacher', { replace: true })
      }
    }
  }, [user, loading, navigate])

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const result = await login({ email, password, role })
      
      if (result.success) {
        // Navigation handled by useEffect above
        if (result.user.role === 'student') {
          navigate('/student')
        } else {
          navigate('/teacher')
        }
      } else {
        setError(result.error || 'Login failed')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container">
      <div className="logo">
        <i className="fas fa-graduation-cap"></i>{' '}
        <span>
          cloud<span className="highlight">ED</span>
        </span>
      </div>
      <div className="login-box">
        <h2>Welcome Back!</h2>

        <div className="role-select" id="roleSelect">
          <label>
            <input
              type="radio"
              name="role"
              checked={role === 'student'}
              onChange={() => setRole('student')}
            />
            <span>Student</span>
            <i className="fas fa-user-graduate" style={{ marginLeft: 8 }}></i>
          </label>
          <label>
            <input
              type="radio"
              name="role"
              checked={role === 'teacher'}
              onChange={() => setRole('teacher')}
            />
            <span>Teacher</span>
            <i className="fas fa-chalkboard-teacher" style={{ marginLeft: 8 }}></i>
          </label>
        </div>

        <form onSubmit={submit} id="loginForm">
          <div className="form-group">
            <label>Email Address</label>
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              disabled={isSubmitting}
            />
          </div>

          <button type="submit" className="login-btn" id="loginBtn" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>
                Logging in...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt" style={{ marginRight: 8 }}></i>
                Login
              </>
            )}
          </button>
        </form>

        {error && <div className="alert error">{error}</div>}

        <p className="signup-link">
          Don't have an account? <a href="/signup">Sign up</a>
        </p>
      </div>
    </div>
  )
}
