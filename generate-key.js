import Database from 'better-sqlite3'
import crypto from 'crypto'

const db = new Database('nightdlc.db')

const username = 'mirnisoldat'

// Генерируем лицензионный ключ в формате XXXX-XXXX-XXXX
function generateLicenseKey() {
  const part1 = crypto.randomBytes(2).toString('hex').toUpperCase()
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase()
  const part3 = crypto.randomBytes(2).toString('hex').toUpperCase()
  return `${part1}-${part2}-${part3}`
}

// Находим пользователя
const user = db.prepare(`
  SELECT uid, username, email, license_key
  FROM users 
  WHERE username = ?
`).get(username)

if (!user) {
  console.log(`❌ Пользователь "${username}" не найден`)
  process.exit(1)
}

// Генерируем новый ключ
const licenseKey = generateLicenseKey()

// Сохраняем ключ в базу данных
db.prepare(`
  UPDATE users 
  SET license_key = ?
  WHERE username = ?
`).run(licenseKey, username)

console.log('✅ Лицензионный ключ сгенерирован!')
console.log(`   Пользователь: ${user.username}`)
console.log(`   Email: ${user.email}`)
console.log(`   UID: ${user.uid}`)
console.log(`\n   🔑 КЛЮЧ: ${licenseKey}\n`)

db.close()
