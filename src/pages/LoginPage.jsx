import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const user = await login({ login: loginValue, password })
      navigate(`/user/${user.uid}`, { replace: true })
    } catch (err) {
      setError(err?.data?.error || err?.message || 'login_failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <section className="auth">
        <div className="authCard">
          <div className="authHeader">
            <div className="authKicker">Welcome back</div>
            <h2 className="h2">Login</h2>
            <div className="sub">Glass lens + purple glow.</div>
          </div>

          <form className="form" onSubmit={onSubmit}>
            <label className="field">
              <span className="label">Username / Email</span>
              <input
                className="input"
                placeholder="mirnisoldat"
                autoComplete="username"
                value={loginValue}
                onChange={(e) => setLoginValue(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="label">Password</span>
              <input
                className="input"
                placeholder="••••••••"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error ? <div className="formError">{String(error)}</div> : null}
            <button type="submit" className="btn btnPrimary btnWide">
              {loading ? '...' : 'Enter'}
            </button>
          </form>

          <div className="authFooter">
            <div className="muted">No account?</div>
            <Link to="/register" className="link">
              Register
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
