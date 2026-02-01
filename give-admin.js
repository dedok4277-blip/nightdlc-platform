import Database from 'better-sqlite3'

const db = new Database('nightdlc.db')

const username = 'mirnisoldat'

// Находим пользователя по имени
const user = db.prepare(`
  SELECT uid, username, email, is_admin
  FROM users 
  WHERE username = ?
`).get(username)

if (!user) {
  console.log(`❌ Пользователь "${username}" не найден`)
  process.exit(1)
}

if (user.is_admin === 1) {
  console.log(`⚠️  Пользователь "${username}" уже является администратором`)
  process.exit(0)
}

// Выдаем права администратора
db.prepare(`
  UPDATE users 
  SET is_admin = 1
  WHERE username = ?
`).run(username)

console.log('✅ Права администратора выданы!')
console.log(`   Пользователь: ${user.username}`)
console.log(`   Email: ${user.email}`)
console.log(`   UID: ${user.uid}`)
console.log(`   Статус: Администратор`)

db.close()
