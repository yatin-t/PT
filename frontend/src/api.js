import axios from 'axios'

// API Configuration
// In development: Vite proxy forwards /api requests to Django backend (see vite.config.js)
// In production: Django serves the React build and handles /api routes
const baseURL = '/api/v1/'

const api = axios.create({
  baseURL,
  withCredentials: true, // Enable session cookies
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('[API] Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`[API] Response ${response.status}:`, response.config.url)
    return response
  },
  (error) => {
    if (error.response) {
      console.error(
        `[API] Error ${error.response.status}:`,
        error.response.config.url,
        error.response.data
      )
      
      // Handle specific error cases
      if (error.response.status === 401) {
        // Unauthorized - user session expired or not logged in
        console.warn('[API] Unauthorized - redirecting to login')
        // Don't redirect on login/signup endpoints
        if (!error.config.url?.includes('auth/login') && !error.config.url?.includes('auth/signup')) {
          window.location.href = '/'
        }
      } else if (error.response.status === 403) {
        console.warn('[API] Forbidden - insufficient permissions')
      } else if (error.response.status === 404) {
        console.warn('[API] Not found:', error.config.url)
      } else if (error.response.status >= 500) {
        console.error('[API] Server error')
      }
    } else if (error.request) {
      console.error('[API] No response received:', error.request)
    } else {
      console.error('[API] Request setup error:', error.message)
    }
    return Promise.reject(error)
  }
)

// Helper function to get CSRF token (sets cookie)
export async function getCsrf() {
  try {
    const response = await api.get('auth/csrf/')
    console.log('[API] CSRF token obtained')
    return response
  } catch (error) {
    console.error('[API] Failed to get CSRF token:', error)
    throw error
  }
}

export default api
