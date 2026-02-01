import Database from 'better-sqlite3'

const db = new Database('nightdlc.db')

const users = db.prepare(`
  SELECT 
    uid, 
    username, 
    email, 
    is_admin as isAdmin,
    created_at as createdAt,
    last_login as lastLogin,
    subscription_tier as tier,
    subscription_expires_at as expiresAt
  FROM users
  ORDER BY created_at DESC
`).all()

console.log('\n=== Зарегистрированные аккаунты ===\n')

users.forEach((user, index) => {
  console.log(`${index + 1}. ${user.username}`)
  console.log(`   UID: ${user.uid}`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Админ: ${user.isAdmin ? 'Да' : 'Нет'}`)
  console.log(`   Подписка: ${user.tier || 'None'}`)
  console.log(`   Создан: ${new Date(user.createdAt).toLocaleString('ru-RU')}`)
  if (user.lastLogin) {
    console.log(`   Последний вход: ${new Date(user.lastLogin).toLocaleString('ru-RU')}`)
  }
  console.log('')
})

console.log(`Всего пользователей: ${users.length}\n`)

db.close()
