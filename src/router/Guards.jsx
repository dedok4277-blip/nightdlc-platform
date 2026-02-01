import { Navigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'

export function RequireAuth({ children }) {
  const { ready, user } = useAuth()
  if (!ready) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

export function RequireAdmin({ children }) {
  const { ready, user } = useAuth()
  if (!ready) return null
  if (!user) return <Navigate to="/login" replace />
  if (!user.isAdmin) return <Navigate to="/" replace />
  return children
}
