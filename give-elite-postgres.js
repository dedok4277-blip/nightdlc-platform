import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

async function giveElite() {
  const username = process.argv[2]

  if (!username) {
    console.log('❌ Укажите имя пользователя')
    console.log('Использование: node give-elite-postgres.js <username>')
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
      'SELECT uid, username, subscription_tier FROM users WHERE username = $1',
      [username]
    )

    if (checkResult.rows.length === 0) {
      console.log(`❌ Пользователь "${username}" не найден`)
      await pool.end()
      process.exit(1)
    }

    const user = checkResult.rows[0]

    // Выдаем вечную Elite подписку (expires_at = 0 означает навсегда)
    await pool.query(
      'UPDATE users SET subscription_tier = $1, subscription_expires_at = $2 WHERE username = $3',
      ['Elite', 0, username]
    )

    console.log(`✅ Пользователю "${username}" (UID: ${user.uid}) выдана вечная Elite подписка`)

    await pool.end()
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
    await pool.end()
    process.exit(1)
  }
}

giveElite()
