// Автоматический выбор базы данных на основе переменных окружения
import dotenv from 'dotenv'
dotenv.config()

let pool

// Если есть DATABASE_URL (PostgreSQL на Render), используем PostgreSQL
if (process.env.DATABASE_URL) {
  const { default: pgPool } = await import('./db-postgres.js')
  pool = pgPool
  console.log('✅ Using PostgreSQL database')
} else {
  // Иначе используем SQLite для локальной разработки
  const Database = (await import('better-sqlite3')).default
  const path = (await import('path')).default
  
  const dbPath = path.resolve('nightdlc.db')
  const db = new Database(dbPath)
  
  db.pragma('foreign_keys = ON')
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid INTEGER NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      avatar_url TEXT,
      is_admin INTEGER NOT NULL DEFAULT 0,
      license_key TEXT,
      created_at INTEGER NOT NULL,
      last_login INTEGER,
      plan TEXT NOT NULL DEFAULT 'Nelon',
      status TEXT NOT NULL DEFAULT 'Active',
      subscription_tier TEXT NOT NULL DEFAULT 'None',
      subscription_expires_at INTEGER NOT NULL DEFAULT 0,
      hwid TEXT
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      server TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      screenshot_path TEXT,
      download_url TEXT,
      view_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS post_likes (
      user_id INTEGER NOT NULL,
      post_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY(user_id, post_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS license_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      used INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      created_by INTEGER,
      used_at INTEGER,
      used_by INTEGER,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(used_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
    CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
    CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
    CREATE INDEX IF NOT EXISTS idx_license_keys_key ON license_keys(key);
    CREATE INDEX IF NOT EXISTS idx_license_keys_used ON license_keys(used);
  `)
  
  // Адаптер для совместимости с PostgreSQL синтаксисом
  pool = {
    execute(sql, params = []) {
      const stmt = db.prepare(sql)
      const result = params.length > 0 ? stmt.run(...params) : stmt.run()
      return [[], result]
    },
    query(sql, params = []) {
      const stmt = db.prepare(sql)
      const rows = params.length > 0 ? stmt.all(...params) : stmt.all()
      return [rows, null]
    }
  }
  
  console.log('✅ Using SQLite database (local development)')
}

// Функция для получения следующего UID
export async function nextUid() {
  if (process.env.DATABASE_URL) {
    // PostgreSQL
    const result = await pool.query('SELECT MAX(uid) as "maxUid" FROM users')
    const maxUid = result[0][0]?.maxUid || 0
    return maxUid + 1
  } else {
    // SQLite
    const [rows] = pool.query('SELECT MAX(uid) as maxUid FROM users')
    const maxUid = rows[0]?.maxUid || 0
    return maxUid + 1
  }
}

export default pool
