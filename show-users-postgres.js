import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

async function showUsers() {
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL не найден в .env файле')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    const result = await pool.query(`
      SELECT 
        uid,
        username,
        email,
        is_admin,
        subscription_tier,
        subscription_expires_at,
        hwid,
        created_at,
        last_login
      FROM users
      ORDER BY created_at DESC
    `)

    console.log('\n📊 Пользователи в базе данных:\n')
    console.log('=' .repeat(100))

    if (result.rows.length === 0) {
      console.log('Пользователей не найдено')
    } else {
      result.rows.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.username} (UID: ${user.uid})`)
        console.log(`   Email: ${user.email}`)
        console.log(`   Админ: ${user.is_admin ? 'Да' : 'Нет'}`)
        console.log(`   Подписка: ${user.subscription_tier}`)
        
        if (user.subscription_expires_at > 0) {
          const date = new Date(user.subscription_expires_at)
          console.log(`   Истекает: ${date.toLocaleString('ru-RU')}`)
        } else if (user.subscription_tier !== 'None') {
          console.log(`   Истекает: Никогда (вечная)`)
        }
        
        if (user.hwid) {
          console.log(`   HWID: ${user.hwid}`)
        }
        
        const created = new Date(user.created_at)
        console.log(`   Создан: ${created.toLocaleString('ru-RU')}`)
        
        if (user.last_login) {
          const lastLogin = new Date(user.last_login)
          console.log(`   Последний вход: ${lastLogin.toLocaleString('ru-RU')}`)
        }
      })
    }

    console.log('\n' + '='.repeat(100))
    console.log(`\nВсего пользователей: ${result.rows.length}\n`)

    await pool.end()
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
    await pool.end()
    process.exit(1)
  }
}

showUsers()
