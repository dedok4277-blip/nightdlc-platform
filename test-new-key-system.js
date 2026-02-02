import pool from './server/db-dual.js'
import crypto from 'crypto'

// Генерируем ключ
function generateKey() {
  const part1 = crypto.randomBytes(2).toString('hex').toUpperCase()
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase()
  const part3 = crypto.randomBytes(2).toString('hex').toUpperCase()
  return `${part1}-${part2}-${part3}`
}

async function testKeySystem() {
  try {
    console.log('🧪 Тестирование новой системы ключей\n')

    // Получаем админа
    const [admins] = await pool.execute('SELECT id, username FROM users WHERE is_admin = 1 LIMIT 1')
    
    if (admins.length === 0) {
      console.log('❌ Админ не найден')
      process.exit(1)
    }

    const admin = admins[0]
    console.log(`✅ Админ найден: ${admin.username}\n`)

    // Генерируем ключи разных типов
    const types = ['Basic', 'Plus', 'Lifetime']
    const generatedKeys = []

    for (const type of types) {
      const key = generateKey()
      await pool.execute(
        'INSERT INTO license_keys (key, subscription_type, created_at, created_by) VALUES (?, ?, ?, ?)',
        [key, type, Date.now(), admin.id]
      )
      generatedKeys.push({ key, type })
      console.log(`✅ Создан ключ ${type}: ${key}`)
    }

    console.log('\n📋 Проверка созданных ключей:\n')

    // Проверяем созданные ключи
    const [keys] = await pool.execute(`
      SELECT 
        lk.key,
        lk.subscription_type as subscriptionType,
        lk.used,
        u.username as createdBy
      FROM license_keys lk
      LEFT JOIN users u ON u.id = lk.created_by
      ORDER BY lk.created_at DESC
      LIMIT 3
    `)

    keys.forEach((k) => {
      console.log(`   🔑 ${k.key}`)
      console.log(`      Тип: ${k.subscriptionType}`)
      console.log(`      Статус: ${k.used ? '❌ Использован' : '✅ Доступен'}`)
      console.log(`      Создал: ${k.createdBy}`)
      console.log()
    })

    // Тестируем активацию ключа
    console.log('🧪 Тестирование активации ключа Basic...\n')
    
    const [users] = await pool.execute('SELECT id, username FROM users WHERE is_admin = 0 LIMIT 1')
    
    if (users.length > 0) {
      const testUser = users[0]
      const basicKey = generatedKeys.find(k => k.type === 'Basic')
      
      console.log(`   Пользователь: ${testUser.username}`)
      console.log(`   Ключ: ${basicKey.key}`)
      
      // Проверяем ключ
      const [keyCheck] = await pool.execute('SELECT * FROM license_keys WHERE key = ? AND used = 0', [basicKey.key])
      
      if (keyCheck.length > 0) {
        console.log('   ✅ Ключ валиден и не использован')
        
        // Активируем ключ
        const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 дней
        await pool.execute('UPDATE license_keys SET used = 1, used_by = ?, used_at = ? WHERE key = ?', [testUser.id, Date.now(), basicKey.key])
        await pool.execute('UPDATE users SET license_key = ?, subscription_tier = ?, subscription_expires_at = ? WHERE id = ?', [basicKey.key, 'Basic', expiresAt, testUser.id])
        
        console.log('   ✅ Ключ активирован!')
        
        // Проверяем результат
        const [updatedUser] = await pool.execute('SELECT subscription_tier, subscription_expires_at FROM users WHERE id = ?', [testUser.id])
        const [updatedKey] = await pool.execute('SELECT used, used_by FROM license_keys WHERE key = ?', [basicKey.key])
        
        console.log(`   ✅ Подписка: ${updatedUser[0].subscription_tier}`)
        console.log(`   ✅ Истекает: ${new Date(Number(updatedUser[0].subscription_expires_at)).toLocaleString('ru-RU')}`)
        console.log(`   ✅ Ключ помечен как использованный: ${updatedKey[0].used === 1 ? 'Да' : 'Нет'}`)
        
        // Пытаемся активировать повторно
        console.log('\n🧪 Попытка повторной активации...')
        const [keyCheck2] = await pool.execute('SELECT * FROM license_keys WHERE key = ? AND used = 0', [basicKey.key])
        
        if (keyCheck2.length === 0) {
          console.log('   ✅ Повторная активация невозможна - ключ уже использован!')
        } else {
          console.log('   ❌ ОШИБКА: Ключ можно активировать повторно!')
        }
      }
    } else {
      console.log('   ⚠️  Нет пользователей для теста активации')
    }

    console.log('\n✅ Тестирование завершено!\n')

  } catch (error) {
    console.error('❌ Ошибка:', error.message)
    console.error(error)
  } finally {
    process.exit(0)
  }
}

testKeySystem()
