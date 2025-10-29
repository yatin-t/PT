import React, { createContext, useContext, useState, useEffect } from 'react'
import api, { getCsrf } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch current user on mount
  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('auth/me/')
      
      if (response.data.user && Object.keys(response.data.user).length > 0) {
        setUser(response.data.user)
        console.log('[Auth] User authenticated:', response.data.user.email)
      } else {
        setUser(null)
        console.log('[Auth] No user session found')
      }
    } catch (err) {
      console.error('[Auth] Error checking authentication:', err)
      setUser(null)
      setError(err.response?.data?.error || 'Failed to check authentication')
    } finally {
      setLoading(false)
    }
  }

  async function login(credentials) {
    try {
      setLoading(true)
      setError(null)
      
      // Get CSRF token first
      await getCsrf()
      
      // Attempt login
      const response = await api.post('auth/login/', credentials)
      
      if (response.data.success && response.data.user) {
        setUser(response.data.user)
        console.log('[Auth] Login successful:', response.data.user.email)
        return { success: true, user: response.data.user }
      } else {
        const errorMsg = response.data.error || 'Login failed'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Login failed'
      console.error('[Auth] Login error:', errorMsg)
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }

  async function signup(userData) {
    try {
      setLoading(true)
      setError(null)
      
      // Get CSRF token first
      await getCsrf()
      
      // Attempt signup
      const response = await api.post('auth/signup/', userData)
      
      if (response.data.success) {
        console.log('[Auth] Signup successful')
        return { success: true }
      } else {
        const errorMsg = response.data.errors || response.data.error || 'Signup failed'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.errors || err.response?.data?.error || err.message || 'Signup failed'
      console.error('[Auth] Signup error:', errorMsg)
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    try {
      setLoading(true)
      await api.post('auth/logout/')
      setUser(null)
      console.log('[Auth] Logout successful')
      return { success: true }
    } catch (err) {
      console.error('[Auth] Logout error:', err)
      // Still clear user on client side even if API call fails
      setUser(null)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isStudent: user?.role === 'student',
    isTeacher: user?.role === 'teacher',
    login,
    signup,
    logout,
    checkAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
