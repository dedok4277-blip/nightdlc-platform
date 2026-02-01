const API_BASE = import.meta.env.DEV ? 'http://localhost:5174' : ''

export function getToken() {
  return localStorage.getItem('nelondlc_token')
}

export function setToken(token) {
  if (token) localStorage.setItem('nelondlc_token', token)
  else localStorage.removeItem('nelondlc_token')
}

export async function api(path, { method = 'GET', body, headers, isForm } = {}) {
  const token = getToken()
  const h = new Headers(headers || {})

  if (token) h.set('Authorization', `Bearer ${token}`)

  let payload = undefined
  if (body != null) {
    if (isForm) {
      payload = body
    } else {
      h.set('Content-Type', 'application/json')
      payload = JSON.stringify(body)
    }
  }

  const res = await fetch(`${API_BASE}${path}`, { method, headers: h, body: payload })
  const text = await res.text()

  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!res.ok) {
    const err = new Error(data?.error || 'request_failed')
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}
