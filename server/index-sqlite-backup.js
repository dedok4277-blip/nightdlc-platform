import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import bcrypt from 'bcryptjs'

import { getDb, nextUid } from './db.js'
import { requireAdmin, requireAuth, signToken } from './auth.js'

const PORT = Number(process.env.PORT || 5173)
const app = express()

app.use(cors())
app.use(express.json({ limit: '2mb' }))

const uploadsDir = path.resolve('uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

app.use('/uploads', express.static(uploadsDir))

// Раздача статических файлов фронтенда в продакшене
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve('dist')
  app.use(express.static(distPath))
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const safe = String(file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')
      cb(null, `${Date.now()}_${Math.random().toString(16).slice(2)}_${safe}`)
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
})

function publicUser(row) {
  const tier = row.subscription_tier || 'None'
  const exp = Number(row.subscription_expires_at || 0)
  const now = Date.now()
  const active = tier !== 'None' && (exp === 0 || exp > now)

  return {
    uid: row.uid,
    username: row.username,
    email: row.email,
    avatarUrl: row.avatar_url || null,
    isAdmin: !!row.is_admin,
    licenseKey: row.license_key || null,
    lastLogin: row.last_login || null,
    plan: row.plan || 'Nelon',
    status: row.status || 'Active',
    subscriptionTier: tier,
    subscriptionExpiresAt: exp,
    subscriptionActive: active,
    hwid: row.hwid || null,
  }
}

function isSubscriptionActive(row) {
  const tier = row.subscription_tier || 'None'
  const exp = Number(row.subscription_expires_at || 0)
  if (tier === 'None') return false
  if (exp === 0) return true
  return exp > Date.now()
}

function normalizeTier(input) {
  const t = String(input || '').trim().toLowerCase()
  if (!t || t === 'none') return 'None'
  if (t === 'basic') return 'Basic'
  if (t === 'plus') return 'Plus'
  if (t === 'elite') return 'Elite'
  return null
}

function defaultExpiryForTier(tier) {
  const now = Date.now()
  if (tier === 'Basic') return now + 30 * 24 * 60 * 60 * 1000
  if (tier === 'Plus') return now + 90 * 24 * 60 * 60 * 1000
  if (tier === 'Elite') return 0
  return 0
}

function ensureSeedAdmin() {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM users WHERE is_admin = 1 LIMIT 1').get()
  if (existing) return

  const username = 'admin'
  const email = 'admin@nelondlc.local'
  const passwordHash = bcrypt.hashSync('admin', 10)
  const uid = nextUid()
  db.prepare(
    'INSERT INTO users (uid, username, email, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?, 1, ?)'
  ).run(uid, username, email, passwordHash, Date.now())
}

ensureSeedAdmin()

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body || {}
  if (!username || !email || !password) return res.status(400).json({ error: 'bad_request' })

  const db = getDb()
  const exists = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email)
  if (exists) return res.status(409).json({ error: 'exists' })

  const uid = nextUid()
  const passwordHash = bcrypt.hashSync(password, 10)
  const info = db
    .prepare(
      'INSERT INTO users (uid, username, email, password_hash, is_admin, created_at, last_login) VALUES (?, ?, ?, ?, 0, ?, ?)'
    )
    .run(uid, username, email, passwordHash, Date.now(), Date.now())

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)
  const token = signToken({ uid: user.uid, id: user.id, isAdmin: !!user.is_admin })
  return res.json({ token, user: publicUser(user) })
})

app.post('/api/auth/login', (req, res) => {
  const { login, password, hwid } = req.body || {}
  if (!login || !password) return res.status(400).json({ error: 'bad_request' })

  const db = getDb()
  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(login, login)
  if (!user) return res.status(401).json({ error: 'invalid_credentials' })

  const ok = bcrypt.compareSync(password, user.password_hash)
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' })

  // Проверка HWID
  if (hwid) {
    if (user.hwid && user.hwid !== hwid) {
      return res.status(403).json({ error: 'invalid_hwid' })
    }
    
    // Если HWID не установлен, привязываем его
    if (!user.hwid) {
      db.prepare('UPDATE users SET hwid = ? WHERE id = ?').run(hwid, user.id)
    }
  }

  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(Date.now(), user.id)
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)

  const token = signToken({ uid: updated.uid, id: updated.id, isAdmin: !!updated.is_admin })
  return res.json({ token, user: publicUser(updated) })
})

app.get('/api/me', requireAuth, (req, res) => {
  const db = getDb()
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: 'not_found' })
  return res.json({ user: publicUser(user) })
})

app.get('/api/me/subscription', requireAuth, (req, res) => {
  const db = getDb()
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: 'not_found' })
  return res.json({
    tier: user.subscription_tier || 'None',
    expiresAt: Number(user.subscription_expires_at || 0),
    active: isSubscriptionActive(user),
  })
})

app.put('/api/me', requireAuth, (req, res) => {
  const { username, password } = req.body || {}
  const db = getDb()

  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!current) return res.status(404).json({ error: 'not_found' })

  if (username && username !== current.username) {
    const exists = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.user.id)
    if (exists) return res.status(409).json({ error: 'username_taken' })
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, req.user.id)
  }

  if (password) {
    const passwordHash = bcrypt.hashSync(password, 10)
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, req.user.id)
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  return res.json({ user: publicUser(updated) })
})

app.get('/api/download/:kind', requireAuth, (req, res) => {
  const kind = String(req.params.kind || '').trim()
  if (kind !== 'version' && kind !== 'launcher') return res.status(404).json({ error: 'not_found' })

  const db = getDb()
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: 'not_found' })
  if (!isSubscriptionActive(user)) return res.status(403).json({ error: 'subscription_required' })

  const ram = String(req.query.ram || '').trim()
  const url = kind === 'version' ? 'https://example.com/version' : 'https://example.com/launcher'
  return res.json({ url, kind, ram: ram || null })
})

app.post('/api/me/avatar-url', requireAuth, (req, res) => {
  const { avatarUrl } = req.body || {}
  if (!avatarUrl) return res.status(400).json({ error: 'bad_request' })

  const db = getDb()
  db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(String(avatarUrl), req.user.id)

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  return res.json({ user: publicUser(updated) })
})

app.post('/api/me/avatar', requireAuth, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' })

  const db = getDb()
  const url = `/uploads/${req.file.filename}`
  db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(url, req.user.id)

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  return res.json({ user: publicUser(updated) })
})

app.post('/api/me/activate-key', requireAuth, (req, res) => {
  const { key } = req.body || {}
  if (!key) return res.status(400).json({ error: 'bad_request' })

  const db = getDb()
  
  // Проверяем существование ключа в таблице license_keys
  const licenseKey = db.prepare('SELECT * FROM license_keys WHERE key = ? AND used = 0').get(String(key))
  if (!licenseKey) return res.status(404).json({ error: 'invalid_key' })

  // Помечаем ключ как использованный
  db.prepare('UPDATE license_keys SET used = 1, used_by = ?, used_at = ? WHERE key = ?').run(req.user.id, Date.now(), String(key))
  
  // Выдаем вечную Elite подписку (expiresAt = 0 означает навсегда)
  db.prepare('UPDATE users SET license_key = ?, subscription_tier = ?, subscription_expires_at = ? WHERE id = ?').run(String(key), 'Elite', 0, req.user.id)
  
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  return res.json({ user: publicUser(updated) })
})

app.get('/api/posts', (req, res) => {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT
        p.id,
        p.server,
        p.title,
        p.description,
        p.screenshot_path AS screenshotPath,
        p.download_url AS downloadUrl,
        p.view_count AS viewCount,
        p.created_at AS createdAt,
        u.uid AS authorUid,
        u.username AS authorUsername,
        u.avatar_url AS authorAvatarUrl,
        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS likeCount
      FROM posts p
      JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
      LIMIT 100`
    )
    .all()

  return res.json({ posts: rows })
})

app.get('/api/posts/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ error: 'bad_request' })

  const db = getDb()
  db.prepare('UPDATE posts SET view_count = view_count + 1 WHERE id = ?').run(id)

  const post = db
    .prepare(
      `SELECT
        p.id,
        p.server,
        p.title,
        p.description,
        p.screenshot_path AS screenshotPath,
        p.download_url AS downloadUrl,
        p.view_count AS viewCount,
        p.created_at AS createdAt,
        u.uid AS authorUid,
        u.username AS authorUsername,
        u.avatar_url AS authorAvatarUrl,
        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS likeCount
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.id = ?`
    )
    .get(id)

  if (!post) return res.status(404).json({ error: 'not_found' })
  return res.json({ post })
})

app.post('/api/posts', requireAuth, upload.single('screenshot'), (req, res) => {
  const { server, title, description, downloadUrl, screenshotUrl } = req.body || {}
  const allowed = new Set(['Reallyworld', 'SpookyTime', 'HolyWorld', 'F0nTimE'])
  if (!allowed.has(server)) return res.status(400).json({ error: 'bad_server' })
  if (!title || !description) return res.status(400).json({ error: 'bad_request' })

  const db = getDb()
  const screenshotPath = screenshotUrl ? String(screenshotUrl) : req.file ? `/uploads/${req.file.filename}` : null

  const info = db
    .prepare(
      'INSERT INTO posts (user_id, server, title, description, screenshot_path, download_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(req.user.id, server, title, description, screenshotPath, downloadUrl || null, Date.now())

  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(info.lastInsertRowid)
  return res.json({ id: post.id })
})

app.post('/api/posts/:id/like', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ error: 'bad_request' })

  const db = getDb()
  const exists = db.prepare('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?').get(req.user.id, id)
  if (exists) {
    db.prepare('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?').run(req.user.id, id)
  } else {
    db.prepare('INSERT INTO post_likes (user_id, post_id, created_at) VALUES (?, ?, ?)').run(req.user.id, id, Date.now())
  }

  const likeCount = db.prepare('SELECT COUNT(*) as c FROM post_likes WHERE post_id = ?').get(id)?.c || 0
  return res.json({ likeCount })
})

app.get('/api/admin/users', requireAuth, requireAdmin, (_req, res) => {
  const db = getDb()
  const users = db
    .prepare(
      `SELECT uid, username, email, avatar_url as avatarUrl, is_admin as isAdmin, license_key as licenseKey,
              created_at as createdAt, last_login as lastLogin, plan, status,
              subscription_tier as subscriptionTier, subscription_expires_at as subscriptionExpiresAt, hwid
       FROM users
       ORDER BY created_at DESC
       LIMIT 500`
    )
    .all()

  const enriched = users.map((u) => {
    const tier = u.subscriptionTier || 'None'
    const exp = Number(u.subscriptionExpiresAt || 0)
    const active = tier !== 'None' && (exp === 0 || exp > Date.now())
    return { ...u, subscriptionTier: tier, subscriptionExpiresAt: exp, subscriptionActive: active }
  })
  return res.json({ users: enriched })
})

app.get('/api/admin/users/search', requireAuth, requireAdmin, (req, res) => {
  const q = String(req.query.q || '').trim()
  const db = getDb()

  if (!q) return res.json({ users: [] })

  const isNum = /^[0-9]+$/.test(q)
  const users = db
    .prepare(
      `SELECT uid, username, email, avatar_url as avatarUrl, is_admin as isAdmin, license_key as licenseKey,
              created_at as createdAt, last_login as lastLogin, plan, status,
              subscription_tier as subscriptionTier, subscription_expires_at as subscriptionExpiresAt, hwid
       FROM users
       WHERE (username LIKE ? OR email LIKE ? OR uid = ?)
       ORDER BY created_at DESC
       LIMIT 200`
    )
    .all(`%${q}%`, `%${q}%`, isNum ? Number(q) : -1)

  const enriched = users.map((u) => {
    const tier = u.subscriptionTier || 'None'
    const exp = Number(u.subscriptionExpiresAt || 0)
    const active = tier !== 'None' && (exp === 0 || exp > Date.now())
    return { ...u, subscriptionTier: tier, subscriptionExpiresAt: exp, subscriptionActive: active }
  })
  return res.json({ users: enriched })
})

app.post('/api/admin/users/:uid/toggle-admin', requireAuth, requireAdmin, (req, res) => {
  const uid = Number(req.params.uid)
  if (!uid) return res.status(400).json({ error: 'bad_request' })

  const db = getDb()
  const user = db.prepare('SELECT id, uid, is_admin FROM users WHERE uid = ?').get(uid)
  if (!user) return res.status(404).json({ error: 'not_found' })

  const next = user.is_admin ? 0 : 1
  db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(next, user.id)

  const updated = db
    .prepare(
      `SELECT uid, username, email, avatar_url as avatarUrl, is_admin as isAdmin, license_key as licenseKey,
              created_at as createdAt, last_login as lastLogin, plan, status,
              subscription_tier as subscriptionTier, subscription_expires_at as subscriptionExpiresAt
       FROM users
       WHERE id = ?`
    )
    .get(user.id)

  const tier = updated?.subscriptionTier || 'None'
  const exp = Number(updated?.subscriptionExpiresAt || 0)
  const active = tier !== 'None' && (exp === 0 || exp > Date.now())
  return res.json({ user: { ...updated, subscriptionTier: tier, subscriptionExpiresAt: exp, subscriptionActive: active } })
})

app.post('/api/admin/users/:uid/subscription', requireAuth, requireAdmin, (req, res) => {
  const uid = Number(req.params.uid)
  if (!uid) return res.status(400).json({ error: 'bad_request' })

  const { tier, expiresAt } = req.body || {}
  const normalizedTier = normalizeTier(tier)
  if (normalizedTier === null) return res.status(400).json({ error: 'bad_request' })

  const db = getDb()
  const user = db.prepare('SELECT id FROM users WHERE uid = ?').get(uid)
  if (!user) return res.status(404).json({ error: 'not_found' })

  const nextExpires = normalizedTier === 'None' ? 0 : Number.isFinite(Number(expiresAt)) ? Number(expiresAt) : defaultExpiryForTier(normalizedTier)
  db.prepare('UPDATE users SET subscription_tier = ?, subscription_expires_at = ? WHERE id = ?').run(normalizedTier, nextExpires, user.id)

  const updated = db
    .prepare(
      `SELECT uid, username, email, avatar_url as avatarUrl, is_admin as isAdmin, license_key as licenseKey,
              created_at as createdAt, last_login as lastLogin, plan, status,
              subscription_tier as subscriptionTier, subscription_expires_at as subscriptionExpiresAt
       FROM users
       WHERE id = ?`
    )
    .get(user.id)

  const active = updated.subscriptionTier !== 'None' && (Number(updated.subscriptionExpiresAt || 0) === 0 || Number(updated.subscriptionExpiresAt || 0) > Date.now())
  return res.json({ user: { ...updated, subscriptionTier: updated.subscriptionTier || 'None', subscriptionExpiresAt: Number(updated.subscriptionExpiresAt || 0), subscriptionActive: active } })
})

app.post('/api/admin/users/:uid/subscription/clear', requireAuth, requireAdmin, (req, res) => {
  const uid = Number(req.params.uid)
  if (!uid) return res.status(400).json({ error: 'bad_request' })

  const db = getDb()
  const user = db.prepare('SELECT id FROM users WHERE uid = ?').get(uid)
  if (!user) return res.status(404).json({ error: 'not_found' })

  db.prepare('UPDATE users SET subscription_tier = ?, subscription_expires_at = ? WHERE id = ?').run('None', 0, user.id)
  return res.json({ ok: true })
})

app.post('/api/admin/users/:uid/reset-hwid', requireAuth, requireAdmin, (req, res) => {
  const uid = Number(req.params.uid)
  if (!uid) return res.status(400).json({ error: 'bad_request' })

  const db = getDb()
  const user = db.prepare('SELECT id FROM users WHERE uid = ?').get(uid)
  if (!user) return res.status(404).json({ error: 'not_found' })

  db.prepare('UPDATE users SET hwid = NULL WHERE id = ?').run(user.id)
  return res.json({ ok: true })
})

app.delete('/api/admin/users/:uid', requireAuth, requireAdmin, (req, res) => {
  const uid = Number(req.params.uid)
  if (!uid) return res.status(400).json({ error: 'bad_request' })

  const db = getDb()
  const target = db.prepare('SELECT id, uid FROM users WHERE uid = ?').get(uid)
  if (!target) return res.status(404).json({ error: 'not_found' })

  const tx = db.transaction(() => {
    const postIds = db.prepare('SELECT id FROM posts WHERE user_id = ?').all(target.id)
    for (const p of postIds) {
      db.prepare('DELETE FROM post_likes WHERE post_id = ?').run(p.id)
    }
    db.prepare('DELETE FROM posts WHERE user_id = ?').run(target.id)
    db.prepare('DELETE FROM post_likes WHERE user_id = ?').run(target.id)
    db.prepare('DELETE FROM users WHERE id = ?').run(target.id)
  })

  tx()
  return res.json({ ok: true })
})

app.get('/api/admin/posts', requireAuth, requireAdmin, (_req, res) => {
  const db = getDb()
  const posts = db
    .prepare(
      `SELECT p.id, p.server, p.title, p.created_at as createdAt, p.view_count as viewCount,
              u.uid as authorUid, u.username as authorUsername,
              (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS likeCount
       FROM posts p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC
       LIMIT 500`
    )
    .all()
  return res.json({ posts })
})

app.delete('/api/admin/posts/:id', requireAuth, requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ error: 'bad_request' })

  const db = getDb()
  db.prepare('DELETE FROM post_likes WHERE post_id = ?').run(id)
  db.prepare('DELETE FROM posts WHERE id = ?').run(id)
  return res.json({ ok: true })
})

app.post('/api/admin/generate-key', requireAuth, requireAdmin, (req, res) => {
  const db = getDb()
  
  // Генерируем ключ в формате XXXX-XXXX-XXXX
  function generateKey() {
    const crypto = require('crypto')
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase()
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase()
    const part3 = crypto.randomBytes(2).toString('hex').toUpperCase()
    return `${part1}-${part2}-${part3}`
  }
  
  const key = generateKey()
  db.prepare('INSERT INTO license_keys (key, created_at, created_by) VALUES (?, ?, ?)').run(key, Date.now(), req.user.id)
  
  return res.json({ key })
})

app.get('/api/admin/keys', requireAuth, requireAdmin, (_req, res) => {
  const db = getDb()
  const keys = db.prepare(`
    SELECT 
      lk.id,
      lk.key,
      lk.used,
      lk.created_at as createdAt,
      lk.used_at as usedAt,
      u1.username as createdBy,
      u2.username as usedBy
    FROM license_keys lk
    LEFT JOIN users u1 ON u1.id = lk.created_by
    LEFT JOIN users u2 ON u2.id = lk.used_by
    ORDER BY lk.created_at DESC
    LIMIT 500
  `).all()
  
  return res.json({ keys })
})

app.delete('/api/admin/keys/:id', requireAuth, requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).json({ error: 'bad_request' })

  const db = getDb()
  db.prepare('DELETE FROM license_keys WHERE id = ?').run(id)
  return res.json({ ok: true })
})

// Для всех остальных маршрутов отдаем index.html (для React Router)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve('dist', 'index.html'))
  })
}

app.listen(PORT, () => {
  process.stdout.write(`nelondlc api listening on http://localhost:${PORT}\n`)
})
