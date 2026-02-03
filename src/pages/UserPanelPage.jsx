import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../state/AuthContext.jsx'
import { api } from '../api/client.js'

export default function UserPanelPage() {
  const { uid } = useParams()
  const { user, setUser } = useAuth()
  const [keyValue, setKeyValue] = useState('')
  const [username, setUsername] = useState(user?.username || '')
  const [password, setPassword] = useState('')
  const [avatarUrlDraft, setAvatarUrlDraft] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [ramGb, setRamGb] = useState('4')
  const [downloadError, setDownloadError] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [soundMuted, setSoundMuted] = useState(() => {
    try {
      return localStorage.getItem('soundMuted') === 'true'
    } catch {
      return false
    }
  })

  const isOwn = String(user?.uid) === String(uid)

  function formatLastLogin(ts) {
    if (!ts) return '—'
    try {
      const d = new Date(Number(ts))
      if (Number.isNaN(d.getTime())) return '—'
      return d.toLocaleString()
    } catch {
      return '—'
    }
  }

  useEffect(() => {
    setUsername(user?.username || '')
  }, [user?.username])

  useEffect(() => {
    if (!isOwn) return
    ;(async () => {
      try {
        const data = await api('/api/me')
        if (data?.user) setUser(data.user)
      } catch {
        // ignore
      }
    })()
  }, [isOwn])

  function formatExpiresAt(ts) {
    const n = Number(ts || 0)
    if (!n) return '—'
    try {
      const d = new Date(n)
      if (Number.isNaN(d.getTime())) return '—'
      return d.toLocaleString()
    } catch {
      return '—'
    }
  }

  async function doDownload(kind) {
    setDownloadError(null)
    setError(null)
    setDownloading(true)
    try {
      const data = await api(`/api/download/${kind}?ram=${encodeURIComponent(String(ramGb))}`)
      if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer')
      else setDownloadError('download_failed')
    } catch (e) {
      const code = e?.data?.error || e?.message || 'download_failed'
      setDownloadError(code)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="page">
      <div className="panel panelDeep">
        <div className="userHead">
          <div>
            <div className="panelTitle">User panel</div>
            <div className="panelText">
              UID: <span className="uid">{uid}</span>
              {isOwn ? null : <span className="mini"> · view only</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="soundToggleBtn"
              onClick={() => {
                if (window.NelonDLC_SFX?.toggleMute) {
                  window.NelonDLC_SFX.toggleMute()
                  setSoundMuted(prev => !prev)
                }
              }}
              title={soundMuted ? 'Включить звук' : 'Выключить звук'}
            >
              {soundMuted ? '🔇' : '🔊'}
            </button>
            {user?.avatarUrl ? <img className="avatar" src={user.avatarUrl} alt="avatar" /> : <div className="avatar avatarEmpty" />}
          </div>
        </div>

        {error ? <div className="formError">{String(error)}</div> : null}

        {isOwn ? (
          <div className="userGrid">
            <div className="miniCard">
              <div className="miniTitle">Status</div>
              <div className="miniValue">{user?.status || '—'}</div>
            </div>
            <div className="miniCard">
              <div className="miniTitle">Plan</div>
              <div className="miniValue">{user?.plan || '—'}</div>
            </div>
            <div className="miniCard">
              <div className="miniTitle">Subscription</div>
              <div className="miniValue">{user?.subscriptionTier || 'None'}</div>
              <div className="rowSub">
                {user?.subscriptionActive ? 'Active' : 'Inactive'}
                {user?.subscriptionActive && Number(user?.subscriptionExpiresAt || 0) ? ` · until ${formatExpiresAt(user?.subscriptionExpiresAt)}` : null}
              </div>
            </div>
            <div className="miniCard">
              <div className="miniTitle">HWID</div>
              <div className="miniValue" style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                {user?.hwid || 'Not linked'}
              </div>
            </div>
            <div className="miniCard">
              <div className="miniTitle">Last login</div>
              <div className="miniValue">{formatLastLogin(user?.lastLogin)}</div>
            </div>
          </div>
        ) : null}

        {isOwn ? (
          <>
            <div className="userSplit">
              <div className="panel panelDeep">
                <div className="panelTitle">Activate key</div>
                <div className="panelText">Key will be required later.</div>
                {user?.subscriptionActive ? (
                  <div className="mini" style={{ marginTop: 10, color: '#4ade80' }}>
                    ✓ У вас уже есть активная подписка {user?.subscriptionTier}
                  </div>
                ) : null}
                <div className="form">
                  <label className="field">
                    <span className="label">Key</span>
                    <input 
                      className="input" 
                      value={keyValue} 
                      onChange={(e) => setKeyValue(e.target.value)} 
                      placeholder="XXXX-XXXX-XXXX"
                      disabled={user?.subscriptionActive}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btnPrimary btnWide"
                    onClick={async () => {
                      setError(null)
                      try {
                        const data = await api('/api/me/activate-key', { method: 'POST', body: { key: keyValue } })
                        setUser(data.user)
                        setKeyValue('')
                      } catch (e) {
                        const errorCode = e?.data?.error || e?.message || 'activate_failed'
                        if (errorCode === 'subscription_already_active') {
                          setError('У вас уже есть активная подписка')
                        } else if (errorCode === 'invalid_key') {
                          setError('Неверный или использованный ключ')
                        } else {
                          setError(errorCode)
                        }
                      }
                    }}
                    disabled={!keyValue || user?.subscriptionActive}
                  >
                    Activate
                  </button>
                </div>
              </div>

              <div className="panel panelDeep">
                <div className="panelTitle">Download</div>
                <div className="panelText">Two ways — choose what you need.</div>
                <label className="field" style={{ marginTop: 10 }}>
                  <span className="label">RAM</span>
                  <select className="input" value={ramGb} onChange={(e) => setRamGb(e.target.value)}>
                    <option value="2">2 GB</option>
                    <option value="4">4 GB</option>
                    <option value="6">6 GB</option>
                    <option value="8">8 GB</option>
                    <option value="12">12 GB</option>
                    <option value="16">16 GB</option>
                  </select>
                </label>
                <div className="downloadRow">
                  <button type="button" className="btn btnPrimary" onClick={() => doDownload('launcher')} disabled={downloading}>
                    Скачать лаунчер
                  </button>
                </div>
                {downloadError ? (
                  <div className="mini" style={{ marginTop: 10 }}>
                    {downloadError === 'subscription_required' ? (
                      <>
                        Subscription required. <Link to="/pricing">Open pricing</Link>
                      </>
                    ) : (
                      String(downloadError)
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="userSplit">
              <div className="panel panelDeep">
                <div className="panelTitle">Profile</div>
                <div className="form">
                  <label className="field">
                    <span className="label">Username</span>
                    <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
                  </label>
                  <label className="field">
                    <span className="label">Rank</span>
                    <div className="rankDisplay">
                      {user?.isAdmin ? (
                        <span className="adminBadge">ADMIN</span>
                      ) : user?.subscriptionTier === 'YOUTUBE' ? (
                        <span className="youtubeBadge">YOUTUBE</span>
                      ) : (
                        user?.subscriptionTier || 'None'
                      )}
                    </div>
                  </label>
                  <label className="field">
                    <span className="label">New password</span>
                    <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                  </label>
                  <button
                    type="button"
                    className="btn btnPrimary btnWide"
                    disabled={saving}
                    onClick={async () => {
                      setSaving(true)
                      setError(null)
                      try {
                        const data = await api('/api/me', { method: 'PUT', body: { username, password: password || undefined } })
                        setUser(data.user)
                        setPassword('')
                      } catch (e) {
                        setError(e?.data?.error || e?.message || 'save_failed')
                      } finally {
                        setSaving(false)
                      }
                    }}
                  >
                    {saving ? '...' : 'Save'}
                  </button>
                </div>
              </div>

              <div className="panel panelDeep">
                <div className="panelTitle">Avatar</div>
                <div className="panelText">Set avatar by URL.</div>
                <div className="form">
                  <label className="field">
                    <span className="label">Avatar URL</span>
                    <input
                      className="input"
                      value={avatarUrlDraft}
                      onChange={(e) => setAvatarUrlDraft(e.target.value)}
                      placeholder="https://.../avatar.png"
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btnPrimary btnWide"
                    onClick={async () => {
                      setError(null)
                      try {
                        const data = await api('/api/me/avatar-url', {
                          method: 'POST',
                          body: { avatarUrl: avatarUrlDraft.trim() },
                        })
                        setUser(data.user)
                        setAvatarUrlDraft('')
                      } catch (er) {
                        setError(er?.data?.error || er?.message || 'avatar_failed')
                      }
                    }}
                    disabled={!avatarUrlDraft.trim()}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
