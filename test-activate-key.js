import Database from 'better-sqlite3'

const db = new Database('nightdlc.db')

const username = 'mirnisoldat'
const key = '4F3C-D9D4-B7AD' // Используем сгенерированный ключ

// Находим пользователя
const user = db.prepare('SELECT id, uid, username, subscription_tier FROM users WHERE username = ?').get(username)

if (!user) {
  console.log(`❌ Пользователь "${username}" не найден`)
  process.exit(1)
}

console.log('👤 Пользователь найден:')
console.log(`   Username: ${user.username}`)
console.log(`   UID: ${user.uid}`)
console.log(`   Текущая подписка: ${user.subscription_tier || 'None'}`)

// Проверяем ключ
const licenseKey = db.prepare('SELECT * FROM license_keys WHERE key = ? AND used = 0').get(key)

if (!licenseKey) {
  console.log(`\n❌ Ключ "${key}" недействителен или уже использован`)
  process.exit(1)
}

console.log(`\n🔑 Ключ "${key}" валиден!`)

// Активируем ключ
db.prepare('UPDATE license_keys SET used = 1, used_by = ?, used_at = ? WHERE key = ?').run(user.id, Date.now(), key)

// Выдаем вечную Elite подписку
db.prepare('UPDATE users SET license_key = ?, subscription_tier = ?, subscription_expires_at = ? WHERE id = ?').run(key, 'Elite', 0, user.id)

console.log('\n✅ Ключ успешно активирован!')
console.log('   Выдана подписка: Elite (навсегда)')

// Проверяем результат
const updated = db.prepare('SELECT username, subscription_tier, subscription_expires_at FROM users WHERE id = ?').get(user.id)
console.log(`\n📊 Обновленные данные:`)
console.log(`   Username: ${updated.username}`)
console.log(`   Подписка: ${updated.subscription_tier}`)
console.log(`   Истекает: ${updated.subscription_expires_at === 0 ? 'Никогда (навсегда)' : new Date(updated.subscription_expires_at).toLocaleString()}`)

db.close()
