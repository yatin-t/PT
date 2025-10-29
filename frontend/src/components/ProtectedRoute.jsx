import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        <i className="fas fa-spinner fa-spin" style={{ marginRight: 10 }}></i>
        Loading...
      </div>
    )
  }

  if (!user) {
    // Not authenticated - redirect to login
    return <Navigate to="/" replace />
  }

  if (requiredRole && user.role !== requiredRole) {
    // Wrong role - redirect to appropriate dashboard
    if (user.role === 'student') {
      return <Navigate to="/student" replace />
    } else if (user.role === 'teacher') {
      return <Navigate to="/teacher" replace />
    }
    return <Navigate to="/" replace />
  }

  return children
}
