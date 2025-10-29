import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import '../css/signup.css'
import '../css/auth.css'

export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('student')
  const [subject, setSubject] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const navigate = useNavigate()
  const { signup } = useAuth()

  useEffect(() => {
    document.body.classList.add('auth-bg')
    return () => document.body.classList.remove('auth-bg')
  }, [])

  async function submit(e) {
    e.preventDefault()
    setError(null)

    // Client-side validation
    if (!fullName.trim()) {
      setError('Please enter your full name')
      return
    }
    if (!email.trim()) {
      setError('Please enter your email')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (role === 'teacher' && !subject.trim()) {
      setError('Please enter the subject you teach')
      return
    }
    if (!agreed) {
      setError('You must agree to the Terms of Use and Privacy Policy')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await signup({
        full_name: fullName,
        email,
        password,
        role,
        subject: role === 'teacher' ? subject : '',
        agreed,
      })

      if (result.success) {
        navigate('/')
      } else {
        if (typeof result.error === 'object') {
          // Handle validation errors from backend
          const errors = Object.entries(result.error)
            .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
            .join('\n')
          setError(errors)
        } else {
          setError(result.error)
        }
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
      <div className="signup-box">
        <h2>Create Your Account</h2>

        <form onSubmit={submit} id="signupForm">
          <label>Full Name</label>
          <input
            name="full_name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isSubmitting}
            required
          />

          <label>Email Address</label>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            required
          />

          <div className="row">
            <div>
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div>
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirm_password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <label>Role</label>
          <select
            id="roleSelect"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>

          <div
            id="subjectInput"
            style={{ display: role === 'teacher' ? 'block' : 'none' }}
          >
            <label>Subject(s) You Want to Teach</label>
            <input
              name="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="terms">
            <label>
              <input
                type="checkbox"
                name="agreed"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={isSubmitting}
              />{' '}
              By signing up, I agree with the <a href="#">Terms of Use</a> &{' '}
              <a href="#">Privacy Policy</a>
            </label>
          </div>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>
                Creating account...
              </>
            ) : (
              'Sign up'
            )}
          </button>
        </form>

        {error && <div className="alert error" style={{ whiteSpace: 'pre-line' }}>{error}</div>}

        <p className="login-link">
          Already have an account? <a href="/">Sign in</a>
        </p>
      </div>
    </div>
  )
}
