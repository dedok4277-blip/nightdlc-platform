import pool from './server/db-dual.js'
import crypto from 'crypto'
import readline from 'readline'

// Генерируем лицензионный ключ в формате XXXX-XXXX-XXXX
function generateLicenseKey() {
  const part1 = crypto.randomBytes(2).toString('hex').toUpperCase()
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase()
  const part3 = crypto.randomBytes(2).toString('hex').toUpperCase()
  return `${part1}-${part2}-${part3}`
}

// Создаем интерфейс для ввода
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

console.log('🔑 Массовый генератор лицензионных ключей\n')
console.log('Доступные типы подписок:')
console.log('1. Basic - 30 дней')
console.log('2. Plus - 90 дней')
console.log('3. Lifetime - навсегда\n')

rl.question('Выберите тип подписки (1-3): ', (typeAnswer) => {
  let subscriptionType = 'Basic'
  
  switch (typeAnswer.trim()) {
    case '1':
      subscriptionType = 'Basic'
      break
    case '2':
      subscriptionType = 'Plus'
      break
    case '3':
      subscriptionType = 'Lifetime'
      break
    default:
      console.log('❌ Неверный выбор, используется Basic по умолчанию')
  }

  rl.question('\nСколько ключей сгенерировать? ', async (countAnswer) => {
    const count = parseInt(countAnswer.trim())
    
    if (isNaN(count) || count < 1 || count > 100) {
      console.log('❌ Неверное количество (допустимо от 1 до 100)')
      rl.close()
      process.exit(1)
    }

    try {
      // Находим админа
      const [admins] = await pool.execute('SELECT id, username FROM users WHERE is_admin = 1 LIMIT 1')
      
      if (admins.length === 0) {
        console.log('❌ Админ не найден')
        process.exit(1)
      }

      const admin = admins[0]
      const keys = []
      
      console.log(`\n⏳ Генерация ${count} ключей типа ${subscriptionType}...\n`)
      
      for (let i = 0; i < count; i++) {
        const key = generateLicenseKey()
        
        await pool.execute(
          'INSERT INTO license_keys (key, subscription_type, created_at, created_by) VALUES (?, ?, ?, ?)',
          [key, subscriptionType, Date.now(), admin.id]
        )
        
        keys.push(key)
      }

      console.log('✅ Ключи успешно сгенерированы!\n')
      console.log(`   Тип подписки: ${subscriptionType}`)
      console.log(`   Количество: ${count}`)
      console.log(`   Создал: ${admin.username}\n`)
      
      console.log('🔑 КЛЮЧИ:')
      console.log('─'.repeat(50))
      keys.forEach((key, index) => {
        console.log(`${(index + 1).toString().padStart(3, ' ')}. ${key}`)
      })
      console.log('─'.repeat(50))
      
      // Показываем информацию о сроке действия
      if (subscriptionType === 'Basic') {
        console.log('\n⏰ Срок действия: 30 дней с момента активации')
      } else if (subscriptionType === 'Plus') {
        console.log('\n⏰ Срок действия: 90 дней с момента активации')
      } else if (subscriptionType === 'Lifetime') {
        console.log('\n⏰ Срок действия: навсегда')
      }
      
      console.log('⚠️  Каждый ключ можно активировать только ОДИН раз!\n')
      
    } catch (error) {
      console.error('❌ Ошибка:', error.message)
    } finally {
      rl.close()
      process.exit(0)
    }
  })
})
