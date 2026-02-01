import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function showUsers() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'cz505339_nelondlc',
      port: Number(process.env.DB_PORT) || 3306,
    })

    const [users] = await connection.execute(`
      SELECT 
        uid, 
        username, 
        email, 
        is_admin as isAdmin,
        created_at as createdAt,
        last_login as lastLogin,
        subscription_tier as tier,
        subscription_expires_at as expiresAt,
        hwid
      FROM users
      ORDER BY created_at DESC
    `)

    console.log('\n=== Зарегистрированные аккаунты ===\n')

    if (users.length === 0) {
      console.log('Пока нет зарегистрированных пользователей\n')
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.username}`)
        console.log(`   UID: ${user.uid}`)
        console.log(`   Email: ${user.email}`)
        console.log(`   Админ: ${user.isAdmin ? 'Да' : 'Нет'}`)
        console.log(`   Подписка: ${user.tier || 'None'}`)
        if (user.hwid) {
          console.log(`   HWID: ${user.hwid}`)
        }
        console.log(`   Создан: ${new Date(Number(user.createdAt)).toLocaleString('ru-RU')}`)
        if (user.lastLogin) {
          console.log(`   Последний вход: ${new Date(Number(user.lastLogin)).toLocaleString('ru-RU')}`)
        }
        console.log('')
      })

      console.log(`Всего пользователей: ${users.length}\n`)
    }

    await connection.end()
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
    process.exit(1)
  }
}

showUsers()
