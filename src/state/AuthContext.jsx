import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, setToken as persistToken } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('nelondlc_token'))
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function boot() {
      if (!token) {
        if (!cancelled) {
          setUser(null)
          setReady(true)
        }
        return
      }

      try {
        const data = await api('/api/me')
        if (!cancelled) {
          setUser(data.user)
          setReady(true)
        }
      } catch {
        persistToken(null)
        if (!cancelled) {
          setToken(null)
          setUser(null)
          setReady(true)
        }
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [token])

  async function login({ login, password }) {
    const data = await api('/api/auth/login', { method: 'POST', body: { login, password } })
    persistToken(data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  async function register({ username, email, password }) {
    const data = await api('/api/auth/register', { method: 'POST', body: { username, email, password } })
    persistToken(data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  function logout() {
    persistToken(null)
    setToken(null)
    setUser(null)
  }

  const value = useMemo(
    () => ({ token, user, ready, login, register, logout, setUser }),
    [token, user, ready]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('AuthProvider missing')
  return ctx
}
