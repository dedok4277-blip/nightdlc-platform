import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cz505339_nelondlc',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// Функция для получения следующего UID
export async function nextUid() {
  const [rows] = await pool.execute('SELECT MAX(uid) as maxUid FROM users')
  const maxUid = rows[0]?.maxUid || 0
  return maxUid + 1
}

// Инициализация таблиц
async function initTables() {
  const connection = await pool.getConnection()
  
  try {
    // Таблица пользователей
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uid INT NOT NULL UNIQUE,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        avatar_url VARCHAR(500),
        is_admin TINYINT(1) DEFAULT 0,
        license_key VARCHAR(255),
        created_at BIGINT NOT NULL,
        last_login BIGINT,
        plan VARCHAR(50) DEFAULT 'Nelon',
        status VARCHAR(50) DEFAULT 'Active',
        subscription_tier VARCHAR(50) DEFAULT 'None',
        subscription_expires_at BIGINT DEFAULT 0,
        hwid VARCHAR(255),
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_uid (uid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Таблица постов
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        server VARCHAR(100) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        screenshot_path VARCHAR(500),
        download_url VARCHAR(500),
        view_count INT DEFAULT 0,
        created_at BIGINT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Таблица лайков
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS post_likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        post_id INT NOT NULL,
        created_at BIGINT NOT NULL,
        UNIQUE KEY unique_like (user_id, post_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        INDEX idx_post_id (post_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Таблица лицензионных ключей
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS license_keys (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(255) NOT NULL UNIQUE,
        used TINYINT(1) DEFAULT 0,
        created_at BIGINT NOT NULL,
        created_by INT,
        used_at BIGINT,
        used_by INT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_key (\`key\`),
        INDEX idx_used (used)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    console.log('✅ MySQL tables initialized')
  } catch (error) {
    console.error('❌ Error initializing tables:', error)
    throw error
  } finally {
    connection.release()
  }
}

// Инициализация при загрузке модуля
await initTables()

export default pool
