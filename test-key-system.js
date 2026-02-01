import Database from 'better-sqlite3'
import crypto from 'crypto'

const db = new Database('nightdlc.db')

// Генерируем ключ
function generateKey() {
  const part1 = crypto.randomBytes(2).toString('hex').toUpperCase()
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase()
  const part3 = crypto.randomBytes(2).toString('hex').toUpperCase()
  return `${part1}-${part2}-${part3}`
}

// Получаем админа
const admin = db.prepare('SELECT id, username FROM users WHERE is_admin = 1 LIMIT 1').get()

if (!admin) {
  console.log('❌ Админ не найден')
  process.exit(1)
}

// Генерируем ключ
const key = generateKey()
db.prepare('INSERT INTO license_keys (key, created_at, created_by) VALUES (?, ?, ?)').run(key, Date.now(), admin.id)

console.log('✅ Ключ сгенерирован!')
console.log(`   Создан: ${admin.username}`)
console.log(`   🔑 КЛЮЧ: ${key}`)

// Проверяем все ключи
const allKeys = db.prepare(`
  SELECT 
    lk.key,
    lk.used,
    u1.username as createdBy,
    u2.username as usedBy
  FROM license_keys lk
  LEFT JOIN users u1 ON u1.id = lk.created_by
  LEFT JOIN users u2 ON u2.id = lk.used_by
  ORDER BY lk.created_at DESC
`).all()

console.log('\n📋 Все ключи в системе:')
allKeys.forEach((k, i) => {
  console.log(`${i + 1}. ${k.key} - ${k.used ? `Использован (${k.usedBy})` : 'Не использован'} - Создан: ${k.createdBy}`)
})

db.close()
