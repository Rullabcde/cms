import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add CSRF token to requests
api.interceptors.request.use((config) => {
  if (['post', 'put', 'delete', 'patch'].includes(config.method || '')) {
    const csrfToken = getCookie('csrf_token')
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken
    }
  }
  return config
})

// Handle 401 responses with token refresh
let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Skip retry for refresh itself, login, or already-retried requests
    const isRefresh = originalRequest.url?.includes('/auth/refresh')
    const isLogin = originalRequest.url?.includes('/auth/login')

    if (error.response?.status === 401 && !originalRequest._retry && !isRefresh && !isLogin) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve) => {
          addRefreshSubscriber(() => {
            resolve(api(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        await api.post('/auth/refresh')
        onRefreshed('')
        isRefreshing = false
        return api(originalRequest)
      } catch {
        isRefreshing = false
        refreshSubscribers = []
        // Redirect to login if refresh fails (unless already on /login)
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login'
        }
      }
    }

    return Promise.reject(error)
  }
)

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

// API functions
export const authApi = {
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
}

export const credentialsApi = {
  list: (params?: Record<string, string>) => api.get('/api/credentials', { params }),
  get: (id: string) => api.get(`/api/credentials/${id}`),
  create: (data: unknown) => api.post('/api/credentials', data),
  update: (id: string, data: unknown) => api.put(`/api/credentials/${id}`, data),
  delete: (id: string) => api.delete(`/api/credentials/${id}`),
}

export const categoriesApi = {
  list: () => api.get('/api/categories'),
  create: (data: unknown) => api.post('/api/categories', data),
  update: (id: string, data: unknown) => api.put(`/api/categories/${id}`, data),
  delete: (id: string) => api.delete(`/api/categories/${id}`),
}

export const usersApi = {
  list: () => api.get('/api/users'),
  updateRole: (id: string, role: string) => api.put(`/api/users/${id}/role`, { role }),
  deactivate: (id: string) => api.put(`/api/users/${id}/deactivate`),
}

export const whitelistApi = {
  list: () => api.get('/api/whitelist'),
  add: (email: string, notes?: string) => api.post('/api/whitelist', { email, notes }),
  remove: (id: string) => api.delete(`/api/whitelist/${id}`),
  bulkImport: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/api/whitelist/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const auditLogsApi = {
  list: (params?: Record<string, string>) => api.get('/api/audit-logs', { params }),
  export: (params?: Record<string, string>) => api.get('/api/audit-logs/export', { params, responseType: 'blob' }),
}
