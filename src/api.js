const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Error de conexión con el servidor')
  return data
}

export function getAvailability(date, service) {
  return request(`/availability?date=${date}&service=${encodeURIComponent(service || '')}`)
}

export function getMonthAvailability(from, service) {
  return request(`/month?from=${from}&service=${encodeURIComponent(service || '')}`)
}

export function createBooking(payload) {
  return request('/bookings', { method: 'POST', body: JSON.stringify(payload) })
}

export function adminLogin(pin) {
  return request('/admin/login', { method: 'POST', body: JSON.stringify({ pin }) })
}

export function adminGetBookings(token, params = {}) {
  const query = new URLSearchParams()
  if (params.date) query.set('date', params.date)
  if (params.status) query.set('status', params.status)
  const qs = query.toString()
  return request(`/admin/bookings${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function adminUpdateBooking(token, id, status) {
  return request(`/admin/bookings/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  })
}

export function adminDeleteBooking(token, id) {
  return request(`/admin/bookings/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function adminGetSettings(token) {
  return request('/admin/settings', { headers: { Authorization: `Bearer ${token}` } })
}

export function adminUpdateSettings(token, settings) {
  return request('/admin/settings', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(settings),
  })
}