// Адаптер для работы с двумя базами данных одновременно
// PostgreSQL (Render) + MySQL (XAMPP)
import dotenv from 'dotenv'
dotenv.config()

let pgPool = null
let mysqlPool = null

// Инициализация PostgreSQL (Render)
if (process.env.DATABASE_URL) {
  const pg = await import('pg')
  pgPool = new pg.default.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  })
  console.log('✅ PostgreSQL (Render) connected')
}

// Инициализация MySQL (XAMPP)
if (process.env.XAMPP_ENABLED === 'true') {
  const mysql = await import('mysql2/promise')
  mysqlPool = mysql.createPool({
    host: process.env.XAMPP_HOST || 'localhost',
    user: process.env.XAMPP_USER || 'root',
    password: process.env.XAMPP_PASSWORD || '',
    database: process.env.XAMPP_DB_NAME || 'nelondlc',
    port: Number(process.env.XAMPP_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  })
  console.log('✅ MySQL (XAMPP) connected')
}

// Определяем основную БД
const primaryDB = process.env.PRIMARY_DB || 'postgres' // 'postgres' или 'mysql'
console.log(`📊 Primary database: ${primaryDB}`)

// Универсальный адаптер
const pool = {
  async query(sql, params = []) {
    const results = {}
    
    // Выполняем запрос в основной БД
    if (primaryDB === 'postgres' && pgPool) {
      try {
        // Конвертируем ? в $1, $2, $3 для PostgreSQL
        let pgSql = sql
        let paramIndex = 1
        pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`)
        
        const pgResult = await pgPool.query(pgSql, params)
        results.primary = pgResult.rows
      } catch (error) {
        console.error('PostgreSQL query error:', error.message)
        throw error
      }
    } else if (primaryDB === 'mysql' && mysqlPool) {
      try {
        const [rows] = await mysqlPool.execute(sql, params)
        results.primary = rows
      } catch (error) {
        console.error('MySQL query error:', error.message)
        throw error
      }
    }
    
    // Синхронизируем со второй БД (если включена)
    if (process.env.SYNC_DATABASES === 'true') {
      if (primaryDB === 'postgres' && mysqlPool) {
        try {
          await mysqlPool.execute(sql, params)
        } catch (error) {
          console.warn('MySQL sync warning:', error.message)
        }
      } else if (primaryDB === 'mysql' && pgPool) {
        try {
          // Конвертируем ? в $1, $2, $3 для PostgreSQL
          let pgSql = sql
          let paramIndex = 1
          pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`)
          
          await pgPool.query(pgSql, params)
        } catch (error) {
          console.warn('PostgreSQL sync warning:', error.message)
        }
      }
    }
    
    return [results.primary, null]
  },

  async execute(sql, params = []) {
    return this.query(sql, params)
  }
}

// Функция для получения следующего UID
export async function nextUid() {
  if (primaryDB === 'postgres' && pgPool) {
    const result = await pgPool.query('SELECT MAX(uid) as "maxUid" FROM users')
    const maxUid = result.rows[0]?.maxUid || 0
    return maxUid + 1
  } else if (primaryDB === 'mysql' && mysqlPool) {
    const [rows] = await mysqlPool.execute('SELECT MAX(uid) as maxUid FROM users')
    const maxUid = rows[0]?.maxUid || 0
    return maxUid + 1
  }
  return 1
}

// Инициализация таблиц для обеих БД
async function initTables() {
  // PostgreSQL таблицы
  if (pgPool) {
    try {
      await pgPool.query(`
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
        );
        
        CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      `)
      
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS posts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          server VARCHAR(255) NOT NULL,
          title VARCHAR(500) NOT NULL,
          description TEXT NOT NULL,
          screenshot_path VARCHAR(500),
          download_url VARCHAR(500),
          view_count INTEGER DEFAULT 0,
          created_at BIGINT NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
        CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
      `)
      
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS post_likes (
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          created_at BIGINT NOT NULL,
          PRIMARY KEY(user_id, post_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
      `)
      
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS license_keys (
          id SERIAL PRIMARY KEY,
          key VARCHAR(255) NOT NULL UNIQUE,
          subscription_type VARCHAR(50) DEFAULT 'Basic',
          used SMALLINT DEFAULT 0,
          created_at BIGINT NOT NULL,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          used_at BIGINT,
          used_by INTEGER REFERENCES users(id) ON DELETE SET NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_license_keys_key ON license_keys(key);
        CREATE INDEX IF NOT EXISTS idx_license_keys_used ON license_keys(used);
      `)
      
      // Добавляем колонку subscription_type если её нет
      await pgPool.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='license_keys' AND column_name='subscription_type'
          ) THEN
            ALTER TABLE license_keys ADD COLUMN subscription_type VARCHAR(50) DEFAULT 'Basic';
          END IF;
        END $$;
      `)
      
      console.log('✅ PostgreSQL tables initialized')
    } catch (error) {
      console.error('PostgreSQL init error:', error.message)
    }
  }
  
  // MySQL таблицы
  if (mysqlPool) {
    try {
      await mysqlPool.execute(`
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `)
      
      await mysqlPool.execute(`
        CREATE TABLE IF NOT EXISTS posts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          server VARCHAR(255) NOT NULL,
          title VARCHAR(500) NOT NULL,
          description TEXT NOT NULL,
          screenshot_path VARCHAR(500),
          download_url VARCHAR(500),
          view_count INT DEFAULT 0,
          created_at BIGINT NOT NULL,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `)
      
      await mysqlPool.execute(`
        CREATE TABLE IF NOT EXISTS post_likes (
          user_id INT NOT NULL,
          post_id INT NOT NULL,
          created_at BIGINT NOT NULL,
          PRIMARY KEY(user_id, post_id),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE,
          INDEX idx_post_id (post_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `)
      
      await mysqlPool.execute(`
        CREATE TABLE IF NOT EXISTS license_keys (
          id INT AUTO_INCREMENT PRIMARY KEY,
          \`key\` VARCHAR(255) NOT NULL UNIQUE,
          subscription_type VARCHAR(50) DEFAULT 'Basic',
          used TINYINT(1) DEFAULT 0,
          created_at BIGINT NOT NULL,
          created_by INT,
          used_at BIGINT,
          used_by INT,
          FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY(used_by) REFERENCES users(id) ON DELETE SET NULL,
          INDEX idx_key (\`key\`),
          INDEX idx_used (used)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `)
      
      // Добавляем колонку subscription_type если её нет
      await mysqlPool.execute(`
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = 'license_keys' 
        AND column_name = 'subscription_type'
      `).then(async ([rows]) => {
        if (rows[0].count === 0) {
          await mysqlPool.execute(`
            ALTER TABLE license_keys 
            ADD COLUMN subscription_type VARCHAR(50) DEFAULT 'Basic' AFTER \`key\`
          `)
        }
      }).catch(() => {})
      
      console.log('✅ MySQL tables initialized')
    } catch (error) {
      console.error('MySQL init error:', error.message)
    }
  }
}

await initTables()

export default pool
export { pgPool, mysqlPool }
