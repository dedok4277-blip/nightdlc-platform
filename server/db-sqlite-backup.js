import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

// Создаем пул соединений
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'cz505339',
  password: process.env.DB_PASSWORD || 'TAa2F64k',
  database: process.env.DB_NAME || 'cz505339_nelondlc',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

// Инициализация таблиц
async function initDatabase() {
  const connection = await pool.getConnection()
  
  try {
    // Таблица пользователей
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uid INT NOT NULL UNIQUE,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        avatar_url TEXT,
        is_admin TINYINT NOT NULL DEFAULT 0,
        license_key VARCHAR(255),
        created_at BIGINT NOT NULL,
        last_login BIGINT,
        plan VARCHAR(50) NOT NULL DEFAULT 'Nelon',
        status VARCHAR(50) NOT NULL DEFAULT 'Active',
        subscription_tier VARCHAR(50) NOT NULL DEFAULT 'None',
        subscription_expires_at BIGINT NOT NULL DEFAULT 0,
        hwid VARCHAR(255),
        INDEX idx_uid (uid),
        INDEX idx_username (username),
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Таблица постов
    await connection.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        server VARCHAR(255) NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        screenshot_path TEXT,
        download_url TEXT,
        view_count INT NOT NULL DEFAULT 0,
        created_at BIGINT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Таблица лайков
    await connection.query(`
      CREATE TABLE IF NOT EXISTS post_likes (
        user_id INT NOT NULL,
        post_id INT NOT NULL,
        created_at BIGINT NOT NULL,
        PRIMARY KEY(user_id, post_id),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE,
        INDEX idx_post_id (post_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Таблица лицензионных ключей
    await connection.query(`
      CREATE TABLE IF NOT EXISTS license_keys (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(255) NOT NULL UNIQUE,
        used TINYINT NOT NULL DEFAULT 0,
        created_at BIGINT NOT NULL,
        created_by INT,
        used_at BIGINT,
        used_by INT,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY(used_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_key (\`key\`),
        INDEX idx_used (used)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    console.log('✅ MySQL database initialized successfully')
  } catch (error) {
    console.error('❌ Error initializing database:', error)
    throw error
  } finally {
    connection.release()
  }
}

// Функция для получения следующего UID
export async function nextUid() {
  const [rows] = await pool.query('SELECT uid FROM users ORDER BY uid ASC')
  let expected = 1
  for (const r of rows) {
    if (r.uid === expected) {
      expected += 1
      continue
    }
    if (r.uid > expected) return expected
  }
  return expected
}

// Экспорт пула для использования в других модулях
export function getDb() {
  return pool
}

// Инициализация при импорте
await initDatabase()

export default pool
