import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'

const MOTTO = [
  'Bustit',
  'NelonDLC',
  'mirnisoldat',
  'glwfix',
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [step, setStep] = useState(1)
  const hint = useMemo(() => MOTTO[Math.floor(Math.random() * MOTTO.length)], [])
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function submit() {
    setError(null)
    if (!username || !email || !password) {
      setError('fill_all_fields')
      return
    }
    if (password !== password2) {
      setError('passwords_do_not_match')
      return
    }

    setLoading(true)
    try {
      const user = await register({ username, email, password })
      navigate(`/user/${user.uid}`, { replace: true })
    } catch (err) {
      setError(err?.data?.error || err?.message || 'register_failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <section className="auth">
        <div className="authCard authCardWide">
          <div className="authHeader">
            <div className="authKicker">Create your identity</div>
            <h2 className="h2">Register</h2>
            <div className="sub">Step {step}/2 · clean · glossy · violet</div>
          </div>

          <div className="registerGrid">
            <div className="registerSide">
              <div className="panel panelDeep">
                <div className="panelTitle">Live preview</div>
                <div className="panelText">
                  Your tag will glow softly. Keep it short and clean.
                </div>
                <div className="previewTag">
                  <span className="previewDot" />
                  <span className="previewText">{hint}</span>
                </div>
                <div className="mini">Hover your cursor around the page for the lens to react.</div>
              </div>
            </div>

            <div className="registerMain">
              {step === 1 ? (
                <form className="form" onSubmit={(e) => e.preventDefault()}>
                  <label className="field">
                    <span className="label">Username</span>
                    <input
                      className="input"
                      placeholder="NelonDLC"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span className="label">Email</span>
                    <input
                      className="input"
                      placeholder="nelon@dlc.gg"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  <button type="button" className="btn btnPrimary btnWide" onClick={() => setStep(2)}>
                    Next
                  </button>
                </form>
              ) : (
                <form className="form" onSubmit={(e) => e.preventDefault()}>
                  <label className="field">
                    <span className="label">Password</span>
                    <input
                      className="input"
                      placeholder="Create a strong password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span className="label">Confirm</span>
                    <input
                      className="input"
                      placeholder="Repeat password"
                      type="password"
                      autoComplete="new-password"
                      value={password2}
                      onChange={(e) => setPassword2(e.target.value)}
                    />
                  </label>

                  {error ? <div className="formError">{String(error)}</div> : null}

                  <div className="formRow">
                    <button type="button" className="btn" onClick={() => setStep(1)}>
                      Back
                    </button>
                    <button type="button" className="btn btnPrimary" onClick={submit} disabled={loading}>
                      {loading ? '...' : 'Create account'}
                    </button>
                  </div>
                </form>
              )}

              <div className="authFooter">
                <div className="muted">Already have an account?</div>
                <Link to="/login" className="link">
                  Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
