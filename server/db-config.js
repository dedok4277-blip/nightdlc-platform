import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

// Определяем окружение
const isProduction = process.env.NODE_ENV === 'production'
const useRemoteXAMPP = process.env.USE_REMOTE_XAMPP === 'true'

// Конфигурация для локального XAMPP
const xamppConfig = {
  host: process.env.XAMPP_HOST || 'localhost',
  user: process.env.XAMPP_USER || 'root',
  password: process.env.XAMPP_PASSWORD || '',
  database: process.env.XAMPP_DB_NAME || 'nelondlc',
  port: Number(process.env.XAMPP_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}

// Конфигурация для облачной БД (Render/другой хостинг)
const cloudConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nelondlc',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}

// Выбираем конфигурацию
let config
let dbLabel

if (useRemoteXAMPP) {
  // Подключение к удаленному XAMPP (если настроили)
  config = xamppConfig
  dbLabel = 'Remote XAMPP'
} else if (isProduction) {
  // Продакшен - используем облачную БД
  config = cloudConfig
  dbLabel = 'Cloud MySQL (Render)'
} else {
  // Разработка - используем локальный XAMPP
  config = xamppConfig
  dbLabel = 'Local XAMPP'
}

console.log(`🗄️  Database mode: ${dbLabel}`)
console.log(`📍 Connecting to: ${config.host}:${config.port}/${config.database}`)

const pool = mysql.createPool(config)

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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4