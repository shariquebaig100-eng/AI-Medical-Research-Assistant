import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 90000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  res => res.data,
  err => {
    const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Network error'
    throw new Error(msg)
  }
)

export const chatApi = {
  getSession:      id   => api.get(`/api/chat/${id}`),
  clearSession:    id   => api.delete(`/api/chat/${id}`),
  getSessions:     ()   => api.get('/api/sessions'),
  submitFeedback:  data => api.post('/api/chat/feedback', data),
}

export default api