import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

// Функция для получения следующего UID
export async function nextUid() {
  const result = await pool.query('SELECT MAX(uid) as "maxUid" FROM users')
  const maxUid = result.rows[0]?.maxUid || 0
  return maxUid + 1
}

// Адаптер для совместимости с MySQL синтаксисом
const poolAdapter = {
  async execute(sql, params = []) {
    // Конвертируем ? в $1, $2, $3...
    let paramIndex = 1
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`)
    
    const result = await pool.query(pgSql, params)
    return [result.rows, result]
  },
  
  async query(sql, params = []) {
    let paramIndex = 1
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`)
    
    const result = await pool.query(pgSql, params)
    return [result.rows, result]
  },
}

// Инициализация таблиц
async function initTables() {
  try {
    // Таблица пользователей
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        uid INTEGER NOT NULL UNIQUE,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        avatar_url VARCHAR(500),
        is_admin SMALLINT DEFAULT 0,
        license_key VARCHAR(255),
        created_at BIGINT NOT NULL,
        last_login BIGINT,
        plan VARCHAR(50) DEFAULT 'Nelon',
        status VARCHAR(50) DEFAULT 'Active',
        subscription_tier VARCHAR(50) DEFAULT 'None',
        subscription_expires_at BIGINT DEFAULT 0,
        hwid VARCHAR(255)
      )
    `)

    await pool.query('CREATE INDEX IF NOT EXISTS idx_username ON users(username)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_email ON users(email)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_uid ON users(uid)')

    // Таблица постов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        server VARCHAR(100) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        screenshot_path VARCHAR(500),
        download_url VARCHAR(500),
        view_count INTEGER DEFAULT 0,
        created_at BIGINT NOT NULL
      )
    `)

    await pool.query('CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at)')

    // Таблица лайков
    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        created_at BIGINT NOT NULL,
        UNIQUE(user_id, post_id)
      )
    `)

    await pool.query('CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id)')

    // Таблица лицензионных ключей
    await pool.query(`
      CREATE TABLE IF NOT EXISTS license_keys (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) NOT NULL UNIQUE,
        used SMALLINT DEFAULT 0,
        created_at BIGINT NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        used_at BIGINT,
        used_by INTEGER REFERENCES users(id) ON DELETE SET NULL
      )
    `)

    await pool.query('CREATE INDEX IF NOT EXISTS idx_license_keys_key ON license_keys(key)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_license_keys_used ON license_keys(used)')

    console.log('✅ PostgreSQL tables initialized')
  } catch (error) {
    console.error('❌ Error initializing tables:', error)
    throw error
  }
}

// Инициализация при загрузке модуля
await initTables()

export default poolAdapter
