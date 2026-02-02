import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import crypto from 'crypto'

dotenv.config()

import pool, { nextUid } from './db-dual.js'
import { requireAdmin, requireAuth, signToken } from './auth.js'
import {
  blockIPMiddleware,
  trackRequestsMiddleware,
  generalLimiter,
  apiLimiter,
  authLimiter,
  speedLimiter,
  logSuspiciousActivity,
  getAntiDDoSStats,
  blockIP,
  unblockIP,
  addToWhitelist
} from './anti-ddos.js'

const PORT = Number(process.env.PORT || 5173)
const app = express()

// 🛡️ Anti-DDoS защита (применяется первой)
app.use(blockIPMiddleware)
app.use(trackRequestsMiddleware)
app.use(logSuspiciousActivity)
app.use(speedLimiter)

app.use(cors())
app.use(express.json({ limit: '2mb' }))

const uploadsDir = path.resolve('uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

app.use('/uploads', express.static(uploadsDir))

// Раздача статических файлов фронтенда
const distPath = path.resolve('dist')
app.use(express.static(distPath))

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

async function ensureSeedAdmin() {
  const [rows] = await pool.query('SELECT id FROM users WHERE is_admin = 1 LIMIT 1')
  if (rows.length > 0) return

  const username = 'admin'
  const email = 'admin@nelondlc.local'
  const passwordHash = bcrypt.hashSync('admin', 10)
  const uid = await nextUid()
  
  await pool.execute(
    'INSERT INTO users (uid, username, email, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?, 1, ?)',
    [uid, username, email, passwordHash, Date.now()]
  )
  console.log('✅ Admin user created: admin / admin')
}

await ensureSeedAdmin()

// 🛡️ Применяем rate limiting для всех API запросов
app.use('/api/', apiLimiter)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.get('/api/ping', (_req, res) => {
  res.json({ 
    ok: true, 
    timestamp: Date.now(),
    message: 'pong'
  })
})

// 🛡️ Endpoints для управления Anti-DDoS (только для админов)
app.get('/api/admin/ddos/stats', requireAuth, requireAdmin, (_req, res) => {
  const stats = getAntiDDoSStats()
  return res.json(stats)
})

app.post('/api/admin/ddos/block', requireAuth, requireAdmin, (req, res) => {
  const { ip, duration, reason } = req.body || {}
  if (!ip) return res.status(400).json({ error: 'IP required' })
  
  const result = blockIP(ip, duration, reason)
  return res.json(result)
})

app.post('/api/admin/ddos/unblock', requireAuth, requireAdmin, (req, res) => {
  const { ip } = req.body || {}
  if (!ip) return res.status(400).json({ error: 'IP required' })
  
  const result = unblockIP(ip)
  return res.json(result)
})

app.post('/api/admin/ddos/whitelist', requireAuth, requireAdmin, (req, res) => {
  const { ip } = req.body || {}
  if (!ip) return res.status(400).json({ error: 'IP required' })
  
  const result = addToWhitelist(ip)
  return res.json(result)
})

// 🛡️ Применяем rate limiting для авторизации
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body || {}
    if (!username || !email || !password) return res.status(400).json({ error: 'bad_request' })

    const [existing] = await pool.execute('SELECT id FROM users WHERE username = ? OR email = ?', [username, email])
    if (existing.length > 0) return res.status(409).json({ error: 'exists' })

    const uid = await nextUid()
    const passwordHash = bcrypt.hashSync(password, 10)
    const [result] = await pool.execute(
      'INSERT INTO users (uid, username, email, password_hash, is_admin, created_at, last_login) VALUES (?, ?, ?, ?, 0, ?, ?)',
      [uid, username, email, passwordHash, Date.now(), Date.now()]
    )

    const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [result.insertId])
    const user = users[0]
    const token = signToken({ uid: user.uid, id: user.id, isAdmin: !!user.is_admin })
    return res.json({ token, user: publicUser(user) })
  } catch (error) {
    console.error('Register error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { login, password, hwid } = req.body || {}
    if (!login || !password) return res.status(400).json({ error: 'bad_request' })

    const [users] = await pool.execute('SELECT * FROM users WHERE username = ? OR email = ?', [login, login])
    if (users.length === 0) return res.status(401).json({ error: 'invalid_credentials' })
    
    const user = users[0]
    const ok = bcrypt.compareSync(password, user.password_hash)
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' })

    // Проверка HWID
    if (hwid) {
      if (user.hwid && user.hwid !== hwid) {
        return res.status(403).json({ error: 'invalid_hwid' })
      }
      
      // Если HWID не установлен, привязываем его
      if (!user.hwid) {
        await pool.execute('UPDATE users SET hwid = ? WHERE id = ?', [hwid, user.id])
      }
    }

    await pool.execute('UPDATE users SET last_login = ? WHERE id = ?', [Date.now(), user.id])
    const [updated] = await pool.execute('SELECT * FROM users WHERE id = ?', [user.id])

    const token = signToken({ uid: updated[0].uid, id: updated[0].id, isAdmin: !!updated[0].is_admin })
    return res.json({ token, user: publicUser(updated[0]) })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.user.id])
    if (users.length === 0) return res.status(404).json({ error: 'not_found' })
    return res.json({ user: publicUser(users[0]) })
  } catch (error) {
    console.error('Get me error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.get('/api/me/subscription', requireAuth, async (req, res) => {
  try {
    const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.user.id])
    if (users.length === 0) return res.status(404).json({ error: 'not_found' })
    const user = users[0]
    return res.json({
      tier: user.subscription_tier || 'None',
      expiresAt: Number(user.subscription_expires_at || 0),
      active: isSubscriptionActive(user),
    })
  } catch (error) {
    console.error('Get subscription error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.put('/api/me', requireAuth, async (req, res) => {
  try {
    const { username, password } = req.body || {}

    const [current] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.user.id])
    if (current.length === 0) return res.status(404).json({ error: 'not_found' })

    if (username && username !== current[0].username) {
      const [exists] = await pool.execute('SELECT id FROM users WHERE username = ? AND id != ?', [username, req.user.id])
      if (exists.length > 0) return res.status(409).json({ error: 'username_taken' })
      await pool.execute('UPDATE users SET username = ? WHERE id = ?', [username, req.user.id])
    }

    if (password) {
      const passwordHash = bcrypt.hashSync(password, 10)
      await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.user.id])
    }

    const [updated] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.user.id])
    return res.json({ user: publicUser(updated[0]) })
  } catch (error) {
    console.error('Update me error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.get('/api/download/:kind', requireAuth, async (req, res) => {
  try {
    const kind = String(req.params.kind || '').trim()
    if (kind !== 'version' && kind !== 'launcher') return res.status(404).json({ error: 'not_found' })

    const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.user.id])
    if (users.length === 0) return res.status(404).json({ error: 'not_found' })
    if (!isSubscriptionActive(users[0])) return res.status(403).json({ error: 'subscription_required' })

    const ram = String(req.query.ram || '').trim()
    const url = kind === 'version' ? 'https://example.com/version' : 'https://example.com/launcher'
    return res.json({ url, kind, ram: ram || null })
  } catch (error) {
    console.error('Download error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.post('/api/me/avatar-url', requireAuth, async (req, res) => {
  try {
    const { avatarUrl } = req.body || {}
    if (!avatarUrl) return res.status(400).json({ error: 'bad_request' })

    await pool.execute('UPDATE users SET avatar_url = ? WHERE id = ?', [String(avatarUrl), req.user.id])

    const [updated] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.user.id])
    return res.json({ user: publicUser(updated[0]) })
  } catch (error) {
    console.error('Update avatar URL error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.post('/api/me/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'no_file' })

    const url = `/uploads/${req.file.filename}`
    await pool.execute('UPDATE users SET avatar_url = ? WHERE id = ?', [url, req.user.id])

    const [updated] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.user.id])
    return res.json({ user: publicUser(updated[0]) })
  } catch (error) {
    console.error('Upload avatar error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.post('/api/me/activate-key', requireAuth, async (req, res) => {
  try {
    const { key } = req.body || {}
    if (!key) return res.status(400).json({ error: 'bad_request' })

    // Проверяем существование ключа в таблице license_keys
    const [keys] = await pool.execute('SELECT * FROM license_keys WHERE key = ? AND used = 0', [String(key)])
    if (keys.length === 0) return res.status(404).json({ error: 'invalid_key' })

    const licenseKey = keys[0]
    const subscriptionType = licenseKey.subscription_type || 'Basic'
    
    // Определяем срок действия подписки
    let expiresAt = 0
    if (subscriptionType === 'Basic') {
      expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 дней
    } else if (subscriptionType === 'Plus') {
      expiresAt = Date.now() + 90 * 24 * 60 * 60 * 1000 // 90 дней
    } else if (subscriptionType === 'Lifetime') {
      expiresAt = 0 // Навсегда
    }

    // Помечаем ключ как использованный (только один раз!)
    await pool.execute('UPDATE license_keys SET used = 1, used_by = ?, used_at = ? WHERE key = ?', [req.user.id, Date.now(), String(key)])
    
    // Выдаем подписку в зависимости от типа ключа
    await pool.execute('UPDATE users SET license_key = ?, subscription_tier = ?, subscription_expires_at = ? WHERE id = ?', [String(key), subscriptionType, expiresAt, req.user.id])
    
    const [updated] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.user.id])
    return res.json({ user: publicUser(updated[0]) })
  } catch (error) {
    console.error('Activate key error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.get('/api/posts', async (_req, res) => {
  try {
    const [rows] = await pool.execute(
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
    return res.json({ posts: rows })
  } catch (error) {
    console.error('Get posts error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.get('/api/posts/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'bad_request' })

    await pool.execute('UPDATE posts SET view_count = view_count + 1 WHERE id = ?', [id])

    const [posts] = await pool.execute(
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
      WHERE p.id = ?`,
      [id]
    )

    if (posts.length === 0) return res.status(404).json({ error: 'not_found' })
    return res.json({ post: posts[0] })
  } catch (error) {
    console.error('Get post error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.post('/api/posts', requireAuth, upload.single('screenshot'), async (req, res) => {
  try {
    const { server, title, description, downloadUrl, screenshotUrl } = req.body || {}
    const allowed = new Set(['Reallyworld', 'SpookyTime', 'HolyWorld', 'F0nTimE'])
    if (!allowed.has(server)) return res.status(400).json({ error: 'bad_server' })
    if (!title || !description) return res.status(400).json({ error: 'bad_request' })

    const screenshotPath = screenshotUrl ? String(screenshotUrl) : req.file ? `/uploads/${req.file.filename}` : null

    const [result] = await pool.execute(
      'INSERT INTO posts (user_id, server, title, description, screenshot_path, download_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, server, title, description, screenshotPath, downloadUrl || null, Date.now()]
    )

    return res.json({ id: result.insertId })
  } catch (error) {
    console.error('Create post error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.post('/api/posts/:id/like', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'bad_request' })

    const [existing] = await pool.execute('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?', [req.user.id, id])
    if (existing.length > 0) {
      await pool.execute('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?', [req.user.id, id])
    } else {
      await pool.execute('INSERT INTO post_likes (user_id, post_id, created_at) VALUES (?, ?, ?)', [req.user.id, id, Date.now()])
    }

    const [count] = await pool.execute('SELECT COUNT(*) as c FROM post_likes WHERE post_id = ?', [id])
    const likeCount = count[0]?.c || 0
    return res.json({ likeCount })
  } catch (error) {
    console.error('Like post error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.get('/api/admin/users', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT uid, username, email, avatar_url as avatarUrl, is_admin as isAdmin, license_key as licenseKey,
              created_at as createdAt, last_login as lastLogin, plan, status,
              subscription_tier as subscriptionTier, subscription_expires_at as subscriptionExpiresAt, hwid
       FROM users
       ORDER BY created_at DESC
       LIMIT 500`
    )

    const enriched = users.map((u) => {
      const tier = u.subscriptionTier || 'None'
      const exp = Number(u.subscriptionExpiresAt || 0)
      const active = tier !== 'None' && (exp === 0 || exp > Date.now())
      return { ...u, subscriptionTier: tier, subscriptionExpiresAt: exp, subscriptionActive: active }
    })
    return res.json({ users: enriched })
  } catch (error) {
    console.error('Get admin users error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.get('/api/admin/users/search', requireAuth, requireAdmin, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()

    if (!q) return res.json({ users: [] })

    const isNum = /^[0-9]+$/.test(q)
    const [users] = await pool.execute(
      `SELECT uid, username, email, avatar_url as avatarUrl, is_admin as isAdmin, license_key as licenseKey,
              created_at as createdAt, last_login as lastLogin, plan, status,
              subscription_tier as subscriptionTier, subscription_expires_at as subscriptionExpiresAt, hwid
       FROM users
       WHERE (username LIKE ? OR email LIKE ? OR uid = ?)
       ORDER BY created_at DESC
       LIMIT 200`,
      [`%${q}%`, `%${q}%`, isNum ? Number(q) : -1]
    )

    const enriched = users.map((u) => {
      const tier = u.subscriptionTier || 'None'
      const exp = Number(u.subscriptionExpiresAt || 0)
      const active = tier !== 'None' && (exp === 0 || exp > Date.now())
      return { ...u, subscriptionTier: tier, subscriptionExpiresAt: exp, subscriptionActive: active }
    })
    return res.json({ users: enriched })
  } catch (error) {
    console.error('Search users error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.post('/api/admin/users/:uid/toggle-admin', requireAuth, requireAdmin, async (req, res) => {
  try {
    const uid = Number(req.params.uid)
    if (!uid) return res.status(400).json({ error: 'bad_request' })

    // Защита: нельзя изменить свои админские права
    if (uid === req.user.uid) {
      return res.status(403).json({ error: 'cannot_toggle_self' })
    }

    const [users] = await pool.execute('SELECT id, uid, is_admin FROM users WHERE uid = ?', [uid])
    if (users.length === 0) return res.status(404).json({ error: 'not_found' })
    const user = users[0]

    const next = user.is_admin ? 0 : 1
    await pool.execute('UPDATE users SET is_admin = ? WHERE id = ?', [next, user.id])

    const [updated] = await pool.execute(
      `SELECT uid, username, email, avatar_url as avatarUrl, is_admin as isAdmin, license_key as licenseKey,
              created_at as createdAt, last_login as lastLogin, plan, status,
              subscription_tier as subscriptionTier, subscription_expires_at as subscriptionExpiresAt
       FROM users
       WHERE id = ?`,
      [user.id]
    )

    const tier = updated[0]?.subscriptionTier || 'None'
    const exp = Number(updated[0]?.subscriptionExpiresAt || 0)
    const active = tier !== 'None' && (exp === 0 || exp > Date.now())
    
    console.log(`👑 Admin ${req.user.username} ${next ? 'granted' : 'revoked'} admin rights for user ${updated[0].username} (UID ${uid})`)
    
    return res.json({ user: { ...updated[0], subscriptionTier: tier, subscriptionExpiresAt: exp, subscriptionActive: active } })
  } catch (error) {
    console.error('Toggle admin error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.post('/api/admin/users/:uid/subscription', requireAuth, requireAdmin, async (req, res) => {
  try {
    const uid = Number(req.params.uid)
    if (!uid) return res.status(400).json({ error: 'bad_request' })

    const { tier, expiresAt } = req.body || {}
    const normalizedTier = normalizeTier(tier)
    if (normalizedTier === null) return res.status(400).json({ error: 'bad_request' })

    const [users] = await pool.execute('SELECT id FROM users WHERE uid = ?', [uid])
    if (users.length === 0) return res.status(404).json({ error: 'not_found' })
    const user = users[0]

    const nextExpires = normalizedTier === 'None' ? 0 : Number.isFinite(Number(expiresAt)) ? Number(expiresAt) : defaultExpiryForTier(normalizedTier)
    await pool.execute('UPDATE users SET subscription_tier = ?, subscription_expires_at = ? WHERE id = ?', [normalizedTier, nextExpires, user.id])

    const [updated] = await pool.execute(
      `SELECT uid, username, email, avatar_url as avatarUrl, is_admin as isAdmin, license_key as licenseKey,
              created_at as createdAt, last_login as lastLogin, plan, status,
              subscription_tier as subscriptionTier, subscription_expires_at as subscriptionExpiresAt
       FROM users
       WHERE id = ?`,
      [user.id]
    )

    const active = updated[0].subscriptionTier !== 'None' && (Number(updated[0].subscriptionExpiresAt || 0) === 0 || Number(updated[0].subscriptionExpiresAt || 0) > Date.now())
    return res.json({ user: { ...updated[0], subscriptionTier: updated[0].subscriptionTier || 'None', subscriptionExpiresAt: Number(updated[0].subscriptionExpiresAt || 0), subscriptionActive: active } })
  } catch (error) {
    console.error('Update subscription error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.post('/api/admin/users/:uid/subscription/clear', requireAuth, requireAdmin, async (req, res) => {
  try {
    const uid = Number(req.params.uid)
    if (!uid) return res.status(400).json({ error: 'bad_request' })

    const [users] = await pool.execute('SELECT id FROM users WHERE uid = ?', [uid])
    if (users.length === 0) return res.status(404).json({ error: 'not_found' })

    await pool.execute('UPDATE users SET subscription_tier = ?, subscription_expires_at = ? WHERE id = ?', ['None', 0, users[0].id])
    return res.json({ ok: true })
  } catch (error) {
    console.error('Clear subscription error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.post('/api/admin/users/:uid/reset-hwid', requireAuth, requireAdmin, async (req, res) => {
  try {
    const uid = Number(req.params.uid)
    if (!uid) return res.status(400).json({ error: 'bad_request' })

    const [users] = await pool.execute('SELECT id FROM users WHERE uid = ?', [uid])
    if (users.length === 0) return res.status(404).json({ error: 'not_found' })

    await pool.execute('UPDATE users SET hwid = NULL WHERE id = ?', [users[0].id])
    return res.json({ ok: true })
  } catch (error) {
    console.error('Reset HWID error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.delete('/api/admin/users/:uid', requireAuth, requireAdmin, async (req, res) => {
  try {
    const uid = Number(req.params.uid)
    if (!uid) return res.status(400).json({ error: 'bad_request' })

    const [targets] = await pool.execute('SELECT id, uid FROM users WHERE uid = ?', [uid])
    if (targets.length === 0) return res.status(404).json({ error: 'not_found' })
    const target = targets[0]

    // MySQL с CASCADE автоматически удалит связанные записи
    await pool.execute('DELETE FROM users WHERE id = ?', [target.id])
    return res.json({ ok: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.get('/api/admin/posts', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [posts] = await pool.execute(
      `SELECT p.id, p.server, p.title, p.created_at as createdAt, p.view_count as viewCount,
              u.uid as authorUid, u.username as authorUsername,
              (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS likeCount
       FROM posts p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC
       LIMIT 500`
    )
    return res.json({ posts })
  } catch (error) {
    console.error('Get admin posts error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.delete('/api/admin/posts/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'bad_request' })

    // MySQL с CASCADE автоматически удалит связанные лайки
    await pool.execute('DELETE FROM posts WHERE id = ?', [id])
    return res.json({ ok: true })
  } catch (error) {
    console.error('Delete post error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.post('/api/admin/generate-key', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { subscriptionType } = req.body || {}
    
    // Проверяем тип подписки
    const validTypes = ['Basic', 'Plus', 'Lifetime']
    const type = validTypes.includes(subscriptionType) ? subscriptionType : 'Basic'
    
    // Генерируем ключ в формате XXXX-XXXX-XXXX
    function generateKey() {
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase()
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase()
      const part3 = crypto.randomBytes(2).toString('hex').toUpperCase()
      return `${part1}-${part2}-${part3}`
    }
    
    const key = generateKey()
    await pool.execute('INSERT INTO license_keys (key, subscription_type, created_at, created_by) VALUES (?, ?, ?, ?)', [key, type, Date.now(), req.user.id])
    
    return res.json({ key, subscriptionType: type })
  } catch (error) {
    console.error('Generate key error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.get('/api/admin/keys', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [keys] = await pool.execute(`
      SELECT 
        lk.id,
        lk.key,
        lk.subscription_type as subscriptionType,
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
    `)
    
    return res.json({ keys })
  } catch (error) {
    console.error('Get keys error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

app.delete('/api/admin/keys/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'bad_request' })

    await pool.execute('DELETE FROM license_keys WHERE id = ?', [id])
    return res.json({ ok: true })
  } catch (error) {
    console.error('Delete key error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Для всех остальных маршрутов отдаем index.html (для React Router)
app.use((req, res, next) => {
  // Пропускаем API запросы
  if (req.path.startsWith('/api/')) {
    return next()
  }
  
  // Пропускаем запросы к статическим файлам
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    return next()
  }
  
  // Для всех остальных отдаем index.html
  res.sendFile(path.resolve('dist', 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  process.stdout.write(`✅ NelonDLC API listening on http://0.0.0.0:${PORT}\n`)
  process.stdout.write(`📊 Database: MySQL (${process.env.DB_NAME})\n`)
  process.stdout.write(`🌐 Access from network: http://<YOUR_IP>:${PORT}\n`)
})
