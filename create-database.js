import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function createDatabase() {
  try {
    // Подключаемся без указания базы данных
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: Number(process.env.DB_PORT) || 3306,
    })

    console.log('✅ Подключение к MySQL успешно')

    // Создаем базу данных
    const dbName = process.env.DB_NAME || 'cz505339_nelondlc'
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    
    console.log(`✅ База данных "${dbName}" создана`)
    
    await connection.end()
    console.log('✅ Готово! Теперь можно запускать сервер: npm start')
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
    process.exit(1)
  }
}

createDatabase()
