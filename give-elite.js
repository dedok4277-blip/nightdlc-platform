import Database from 'better-sqlite3'

const db = new Database('nelondlc.db')

// Получаем последнего зарегистрированного пользователя (не админа)
const user = db.prepare(`
  SELECT uid, username, email 
  FROM users 
  WHERE is_admin = 0 
  ORDER BY created_at DESC 
  LIMIT 1
`).get()

if (!user) {
  console.log('❌ Пользователь не найден')
  process.exit(1)
}

// Выдаем Elite подписку навсегда (expiresAt = 0 означает бессрочно)
db.prepare(`
  UPDATE users 
  SET subscription_tier = 'Elite', 
      subscription_expires_at = 0 
  WHERE uid = ?
`).run(user.uid)

console.log('✅ Вечная Elite подписка выдана!')
console.log(`   Пользователь: ${user.username}`)
console.log(`   Email: ${user.email}`)
console.log(`   UID: ${user.uid}`)
console.log(`   Подписка: Elite (навсегда)`)

db.close()
