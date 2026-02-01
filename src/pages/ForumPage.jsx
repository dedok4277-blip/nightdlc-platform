import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client.js'
import { useAuth } from '../state/AuthContext.jsx'

const SERVERS = ['Reallyworld', 'SpookyTime', 'HolyWorld', 'F0nTimE']

function excerpt(s, n = 120) {
  const t = String(s || '').trim()
  if (t.length <= n) return t
  return `${t.slice(0, n).trim()}…`
}

function rand(min, max, seed) {
  const x = Math.sin(seed) * 10000
  const r = x - Math.floor(x)
  return min + r * (max - min)
}

function SuccessOverlay({ show, text = 'Successfully!' }) {
  const [out, setOut] = useState(false)

  useEffect(() => {
    if (!show) {
      setOut(false)
      return
    }

    const t = setTimeout(() => setOut(true), 780)
    return () => clearTimeout(t)
  }, [show])

  if (!show) return null

  const letters = Array.from(text).map((ch, i) => {
    const seed = i * 17.13 + ch.charCodeAt(0)
    return {
      ch,
      i,
      sx: rand(-26, 26, seed + 1),
      sy: rand(-22, 22, seed + 2),
      sr: rand(-18, 18, seed + 3),
      sd: rand(0, 220, seed + 4),
      ox: rand(-140, 140, seed + 10),
      oy: rand(-110, 110, seed + 11),
      or: rand(-60, 60, seed + 12),
      od: rand(0, 220, seed + 13),
    }
  })

  return (
    <div className="successOverlay" aria-hidden="true">
      <div className="successCard">
        <div className="successKicker">Config created</div>
        <div className="successWord">
          <span className="successChars">
            {letters.map((l) => (
              <span
                key={l.i}
                className={`successChar${out ? ' successCharOut' : ''}`}
                style={{
                  '--sx': `${l.sx}px`,
                  '--sy': `${l.sy}px`,
                  '--sr': `${l.sr}deg`,
                  '--sd': `${Math.round(l.sd)}ms`,
                  '--ox': `${l.ox}px`,
                  '--oy': `${l.oy}px`,
                  '--or': `${l.or}deg`,
                  '--od': `${Math.round(l.od)}ms`,
                }}
              >
                {l.ch === ' ' ? '\u00A0' : l.ch}
              </span>
            ))}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function ForumPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [open, setOpen] = useState(false)
  const [server, setServer] = useState(SERVERS[0])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [screenshotUrlDraft, setScreenshotUrlDraft] = useState('')
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  const [serverOpen, setServerOpen] = useState(false)
  const serverRef = useRef(null)

  const [successShow, setSuccessShow] = useState(false)

  const canCreate = !!user

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await api('/api/posts')
      setPosts(data.posts || [])
    } catch (e) {
      setError(e?.message || 'failed_to_load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const sorted = useMemo(() => posts, [posts])

  useEffect(() => {
    if (!serverOpen) return
    function onDown(e) {
      if (!serverRef.current) return
      if (!serverRef.current.contains(e.target)) setServerOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [serverOpen])

  async function openPost(p) {
    try {
      const data = await api(`/api/posts/${p.id}`)
      setPosts((prev) => prev.map((x) => (x.id === p.id ? data.post : x)))
    } catch {
      // ignore
    }
  }

  async function toggleLike(p) {
    if (!user) return
    try {
      const data = await api(`/api/posts/${p.id}/like`, { method: 'POST' })
      setPosts((prev) => prev.map((x) => (x.id === p.id ? { ...x, likeCount: data.likeCount } : x)))
    } catch {
      // ignore
    }
  }

  async function createConfig() {
    if (!user) return
    setCreateError(null)
    if (!title || !description) {
      setCreateError('fill_title_and_description')
      return
    }

    setCreating(true)
    try {
      await api('/api/posts', {
        method: 'POST',
        body: {
          server,
          title,
          description,
          downloadUrl: downloadUrl || undefined,
          screenshotUrl: screenshotUrl || undefined,
        },
      })

      setSuccessShow(true)
      try {
        window.NelonDLC_SFX?.success?.()
      } catch {
        // ignore
      }
      setTimeout(() => setSuccessShow(false), 1750)

      setOpen(false)
      setTitle('')
      setDescription('')
      setDownloadUrl('')
      setScreenshotUrlDraft('')
      setScreenshotUrl('')
      setServerOpen(false)
      await load()
    } catch (e) {
      setCreateError(e?.data?.error || e?.message || 'create_failed')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="page">
      <SuccessOverlay show={successShow} text="Successfully!" />
      <div className="panel panelDeep">
        <div className="forumHead">
          <div>
            <div className="panelTitle">Forum</div>
            <div className="panelText">Configs feed — create and share presets for servers.</div>
          </div>
          <button
            type="button"
            className="btn btnPrimary"
            onClick={() => (canCreate ? setOpen(true) : null)}
            title={canCreate ? 'Create config' : 'Login to create configs'}
            disabled={!canCreate}
          >
            Create config
          </button>
        </div>

        {error ? <div className="formError">{String(error)}</div> : null}

        {loading ? (
          <div className="forumEmpty">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="forumEmpty">No configs yet. Be the first.</div>
        ) : (
          <div className="postList">
            {sorted.map((p) => (
              <div key={p.id} className="post">
                <button type="button" className="postMain" onClick={() => openPost(p)}>
                  <div className="postLeft">
                    <div className="postServer">{p.server}</div>
                    <div className="postTitle">{p.title}</div>
                    <div className="postDesc">{excerpt(p.description)}</div>
                    <div className="postMeta">
                      <span className="metaItem">by {p.authorUsername} · UID {p.authorUid}</span>
                      <span className="metaItem">views {p.viewCount}</span>
                    </div>
                  </div>

                  <div className="postRight">
                    {p.screenshotPath ? (
                      <img className="postShot" src={p.screenshotPath} alt="screenshot" loading="lazy" />
                    ) : (
                      <div className="postShot postShotEmpty">No screenshot</div>
                    )}
                  </div>
                </button>

                <div className="postActions">
                  <button type="button" className="chip" onClick={() => toggleLike(p)} disabled={!user}>
                    <span className="chipText">Like</span>
                    <span className="chipText">{p.likeCount || 0}</span>
                  </button>
                  {p.downloadUrl ? (
                    <a className="chip chipPrimary" href={p.downloadUrl} target="_blank" rel="noreferrer">
                      <span className="chipText">Download</span>
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {open ? (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modalHead">
              <div className="panelTitle">Create config</div>
              <button type="button" className="chip" onClick={() => setOpen(false)}>
                <span className="chipText">Close</span>
              </button>
            </div>

            <div className="form">
              <label className="field">
                <span className="label">Server</span>
                <div className="serverPick" ref={serverRef}>
                  <button
                    type="button"
                    className={`serverButton${serverOpen ? ' serverButtonOpen' : ''}`}
                    onClick={() => setServerOpen((v) => !v)}
                  >
                    <span>{server}</span>
                    <span className="serverItemDot" aria-hidden="true" />
                  </button>
                  {serverOpen ? (
                    <div className="serverMenu" role="listbox" aria-label="Servers">
                      {SERVERS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`serverItem${s === server ? ' serverItemActive' : ''}`}
                          onClick={() => {
                            setServer(s)
                            setServerOpen(false)
                          }}
                        >
                          <span>{s}</span>
                          {s === server ? <span className="serverItemDot" aria-hidden="true" /> : <span />}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </label>

              <label className="field">
                <span className="label">Title</span>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Config name" />
              </label>

              <label className="field">
                <span className="label">Description</span>
                <textarea
                  className="input inputArea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What it does, what server, how to use"
                  rows={4}
                />
              </label>

              <label className="field">
                <span className="label">Download URL</span>
                <input
                  className="input"
                  value={downloadUrl}
                  onChange={(e) => setDownloadUrl(e.target.value)}
                  placeholder="https://..."
                />
              </label>

              <label className="field">
                <span className="label">Screenshot URL</span>
                <input
                  className="input"
                  value={screenshotUrlDraft}
                  onChange={(e) => setScreenshotUrlDraft(e.target.value)}
                  placeholder="https://.../image.png"
                />
              </label>

              <div className="formRow">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setScreenshotUrl(screenshotUrlDraft.trim())}
                  disabled={!screenshotUrlDraft.trim()}
                >
                  Save screenshot link
                </button>
                {screenshotUrl ? <div className="mini">Saved</div> : <div className="mini">Not saved</div>}
              </div>

              {screenshotUrl ? <img className="postShot" src={screenshotUrl} alt="preview" /> : null}

              {createError ? <div className="formError">{String(createError)}</div> : null}
              <button type="button" className="btn btnPrimary btnWide" onClick={createConfig} disabled={creating}>
                {creating ? '...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
