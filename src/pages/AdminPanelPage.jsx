import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client.js'
import { useAuth } from '../state/AuthContext.jsx'

export default function AdminPanelPage() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [posts, setPosts] = useState([])
  const [keys, setKeys] = useState([])
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [busyUid, setBusyUid] = useState(null)
  const [generating, setGenerating] = useState(false)

  async function load() {
    setError(null)
    try {
      const [u, p, k] = await Promise.all([api('/api/admin/users'), api('/api/admin/posts'), api('/api/admin/keys')])
      setUsers(u.users || [])
      setPosts(p.posts || [])
      setKeys(k.keys || [])
    } catch (e) {
      setError(e?.data?.error || e?.message || 'failed_to_load')
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const query = q.trim()
    if (!query) return

    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const data = await api(`/api/admin/users/search?q=${encodeURIComponent(query)}`)
        setUsers(data.users || [])
      } catch (e) {
        setError(e?.data?.error || e?.message || 'search_failed')
      } finally {
        setSearching(false)
      }
    }, 240)

    return () => clearTimeout(t)
  }, [q])

  const filteredUsers = useMemo(() => {
    const query = q.trim()
    if (!query) return users
    return users
  }, [users, q])

  async function toggleAdmin(uid) {
    // Защита от снятия админки с самого себя
    if (String(uid) === String(me?.uid)) {
      setError('cannot_toggle_self')
      alert('❌ Вы не можете изменить свои админские права!')
      return
    }

    const targetUser = users.find(u => String(u.uid) === String(uid))
    if (!targetUser) return

    const action = targetUser.isAdmin ? 'забрать админку у' : 'выдать админку'
    const ok = window.confirm(`Вы уверены, что хотите ${action} пользователя ${targetUser.username} (UID ${uid})?`)
    if (!ok) return

    setError(null)
    setBusyUid(uid)
    try {
      const data = await api(`/api/admin/users/${uid}/toggle-admin`, { method: 'POST' })
      setUsers((prev) => prev.map((u) => (String(u.uid) === String(uid) ? data.user : u)))
      
      // Показываем уведомление об успехе
      const newStatus = data.user.isAdmin ? 'выдана' : 'забрана'
      alert(`✅ Админка успешно ${newStatus} пользователю ${targetUser.username}`)
    } catch (e) {
      setError(e?.data?.error || e?.message || 'toggle_failed')
      alert(`❌ Ошибка: ${e?.data?.error || e?.message || 'toggle_failed'}`)
    } finally {
      setBusyUid(null)
    }
  }

  async function setSubscription(uid, tier) {
    setError(null)
    setBusyUid(uid)
    try {
      const data = await api(`/api/admin/users/${uid}/subscription`, { method: 'POST', body: { tier } })
      setUsers((prev) => prev.map((u) => (String(u.uid) === String(uid) ? data.user : u)))
    } catch (e) {
      setError(e?.data?.error || e?.message || 'subscription_failed')
    } finally {
      setBusyUid(null)
    }
  }

  async function clearSubscription(uid) {
    setError(null)
    setBusyUid(uid)
    try {
      await api(`/api/admin/users/${uid}/subscription/clear`, { method: 'POST' })
      setUsers((prev) =>
        prev.map((u) =>
          String(u.uid) === String(uid)
            ? { ...u, subscriptionTier: 'None', subscriptionExpiresAt: 0, subscriptionActive: false }
            : u
        )
      )
    } catch (e) {
      setError(e?.data?.error || e?.message || 'subscription_clear_failed')
    } finally {
      setBusyUid(null)
    }
  }

  async function resetHWID(uid) {
    const ok = window.confirm(`Reset HWID for user UID ${uid}? This will allow them to login from a different computer.`)
    if (!ok) return

    setError(null)
    setBusyUid(uid)
    try {
      await api(`/api/admin/users/${uid}/reset-hwid`, { method: 'POST' })
      setUsers((prev) =>
        prev.map((u) =>
          String(u.uid) === String(uid)
            ? { ...u, hwid: null }
            : u
        )
      )
    } catch (e) {
      setError(e?.data?.error || e?.message || 'reset_hwid_failed')
    } finally {
      setBusyUid(null)
    }
  }

  async function deleteUser(uid) {
    if (String(uid) === String(me?.uid)) {
      setError('cannot_delete_self')
      return
    }

    const ok = window.confirm(`Delete user UID ${uid}? This will remove their posts and likes.`)
    if (!ok) return

    setError(null)
    setBusyUid(uid)
    try {
      await api(`/api/admin/users/${uid}`, { method: 'DELETE' })
      setUsers((prev) => prev.filter((u) => String(u.uid) !== String(uid)))
      setPosts((prev) => prev.filter((p) => String(p.authorUid) !== String(uid)))
    } catch (e) {
      setError(e?.data?.error || e?.message || 'delete_user_failed')
    } finally {
      setBusyUid(null)
    }
  }

  async function deletePost(id) {
    try {
      await api(`/api/admin/posts/${id}`, { method: 'DELETE' })
      setPosts((prev) => prev.filter((p) => p.id !== id))
    } catch (e) {
      setError(e?.data?.error || e?.message || 'delete_failed')
    }
  }

  async function generateKey() {
    setError(null)
    setGenerating(true)
    try {
      const data = await api('/api/admin/generate-key', { method: 'POST' })
      if (data?.key) {
        await load()
        alert(`Ключ сгенерирован: ${data.key}`)
      }
    } catch (e) {
      setError(e?.data?.error || e?.message || 'generate_failed')
    } finally {
      setGenerating(false)
    }
  }

  async function deleteKey(id) {
    try {
      await api(`/api/admin/keys/${id}`, { method: 'DELETE' })
      setKeys((prev) => prev.filter((k) => k.id !== id))
    } catch (e) {
      setError(e?.data?.error || e?.message || 'delete_key_failed')
    }
  }

  function formatDate(ts) {
    if (!ts) return '—'
    try {
      const d = new Date(Number(ts))
      if (Number.isNaN(d.getTime())) return '—'
      return d.toLocaleString('ru-RU')
    } catch {
      return '—'
    }
  }

  return (
    <div className="page">
      <div className="panel panelDeep adminPanelEnter">
        <div className="adminHead">
          <div>
            <div className="panelTitle">Admin panel</div>
            <div className="panelText">Users, configs and moderation.</div>
          </div>
          <button type="button" className="btn" onClick={load}>
            Refresh
          </button>
        </div>

        <div className="adminTools">
          <label className="adminSearch">
            <span className="label">Search</span>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="UID / username / email"
            />
          </label>
          <div className="mini">{searching ? 'Searching…' : q.trim() ? `Results: ${filteredUsers.length}` : `Total: ${users.length}`}</div>
        </div>

        {error ? <div className="formError">{String(error)}</div> : null}

        <div className="adminSplit">
          <div className="adminCol">
            <div className="panelTitle">Users</div>
            <div className="adminList">
              {filteredUsers.map((u) => (
                <div key={u.uid} className="row">
                  <div className="rowMain">
                    <div className="rowTitle">
                      {u.username} <span className="uid">UID {u.uid}</span>
                    </div>
                    <div className="rowSub">
                      {u.email}
                      {u.subscriptionTier ? ` · ${u.subscriptionTier}` : ''}
                      {u.subscriptionActive ? ' (active)' : ''}
                      {u.hwid ? ` · HWID: ${u.hwid.substring(0, 16)}...` : ' · HWID: Not linked'}
                    </div>
                  </div>
                  <div className="adminRowActions">
                    <button
                      type="button"
                      className={`chip ${u.isAdmin ? 'chipPrimary' : 'chipSecondary'}`}
                      onClick={() => toggleAdmin(u.uid)}
                      disabled={busyUid === u.uid || String(u.uid) === String(me?.uid)}
                      title={u.isAdmin ? 'Забрать админку' : 'Выдать админку'}
                      style={{
                        fontWeight: 'bold',
                        minWidth: '80px',
                        backgroundColor: u.isAdmin ? '#ff4444' : '#4CAF50',
                        color: 'white',
                        border: 'none'
                      }}
                    >
                      <span className="chipText">{u.isAdmin ? '👑 ADMIN' : '👤 USER'}</span>
                    </button>

                    <button
                      type="button"
                      className="chip"
                      onClick={() => setSubscription(u.uid, 'Basic')}
                      disabled={busyUid === u.uid}
                      title="Grant Basic"
                    >
                      <span className="chipText">Basic</span>
                    </button>
                    <button
                      type="button"
                      className="chip"
                      onClick={() => setSubscription(u.uid, 'Plus')}
                      disabled={busyUid === u.uid}
                      title="Grant Plus"
                    >
                      <span className="chipText">Plus</span>
                    </button>
                    <button
                      type="button"
                      className="chip"
                      onClick={() => setSubscription(u.uid, 'Elite')}
                      disabled={busyUid === u.uid}
                      title="Grant Elite"
                    >
                      <span className="chipText">Elite</span>
                    </button>
                    <button
                      type="button"
                      className="chip"
                      onClick={() => clearSubscription(u.uid)}
                      disabled={busyUid === u.uid}
                      title="Clear subscription"
                    >
                      <span className="chipText">Clear</span>
                    </button>

                    <button
                      type="button"
                      className="chip"
                      onClick={() => resetHWID(u.uid)}
                      disabled={busyUid === u.uid || !u.hwid}
                      title={u.hwid ? 'Reset HWID' : 'No HWID linked'}
                    >
                      <span className="chipText">Reset HWID</span>
                    </button>

                    <button
                      type="button"
                      className="chip"
                      onClick={() => deleteUser(u.uid)}
                      disabled={busyUid === u.uid || String(u.uid) === String(me?.uid)}
                      title={String(u.uid) === String(me?.uid) ? 'You cannot delete yourself' : 'Delete user'}
                    >
                      <span className="chipText">Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="adminCol">
            <div className="panelTitle">License Keys</div>
            <button type="button" className="btn btnPrimary" onClick={generateKey} disabled={generating} style={{ marginBottom: 10 }}>
              {generating ? 'Generating...' : 'Generate Key'}
            </button>
            <div className="mini">Total: {keys.length}</div>
            <div className="adminList">
              {keys.map((k) => (
                <div key={k.id} className="row">
                  <div className="rowMain">
                    <div className="rowTitle" style={{ fontFamily: 'monospace', fontSize: '14px' }}>
                      {k.key}
                    </div>
                    <div className="rowSub">
                      {k.used ? `Used by ${k.usedBy || 'unknown'} at ${formatDate(k.usedAt)}` : 'Not used'}
                      {' · Created by '}{k.createdBy || 'unknown'}{' at '}{formatDate(k.createdAt)}
                    </div>
                  </div>
                  <button type="button" className="chip" onClick={() => deleteKey(k.id)}>
                    <span className="chipText">Delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="adminSplit">
          <div className="adminCol">
            <div className="panelTitle">Posts</div>
            <div className="mini">Total: {posts.length}</div>
            <div className="adminList">
              {posts.map((p) => (
                <div key={p.id} className="row">
                  <div className="rowMain">
                    <div className="rowTitle">
                      #{p.id} {p.title}
                    </div>
                    <div className="rowSub">
                      {p.server} · by {p.authorUsername} (UID {p.authorUid}) · views {p.viewCount} · likes {p.likeCount}
                    </div>
                  </div>
                  <button type="button" className="chip" onClick={() => deletePost(p.id)}>
                    <span className="chipText">Delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
