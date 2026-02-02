import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

async function giveAdmin() {
  const username = process.argv[2]

  if (!username) {
    console.log('❌ Укажите имя пользователя')
    console.log('Использование: node give-admin-postgres.js <username>')
    process.exit(1)
  }

  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL не найден в .env файле')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    // Проверяем существование пользователя
    const checkResult = await pool.query(
      'SELECT uid, username, is_admin FROM users WHERE username = $1',
      [username]
    )

    if (checkResult.rows.length === 0) {
      console.log(`❌ Пользователь "${username}" не найден`)
      await pool.end()
      process.exit(1)
    }

    const user = checkResult.rows[0]

    if (user.is_admin) {
      console.log(`ℹ️  Пользователь "${username}" уже является администратором`)
      await pool.end()
      process.exit(0)
    }

    // Выдаем права администратора
    await pool.query(
      'UPDATE users SET is_admin = 1 WHERE username = $1',
      [username]
    )

    console.log(`✅ Пользователю "${username}" (UID: ${user.uid}) выданы права администратора`)

    await pool.end()
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
    await pool.end()
    process.exit(1)
  }
}

giveAdmin()
