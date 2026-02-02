import pool from './server/db-dual.js'

async function showKeys() {
  try {
    const [keys] = await pool.execute(`
      SELECT 
        lk.id,
        lk.key,
        lk.subscription_type as subscriptionType,
        lk.used,
        lk.created_at as createdAt,
        lk.used_at as usedAt,
        u1.username as createdBy,
        u2.username as usedBy
      FROM license_keys lk
      LEFT JOIN users u1 ON u1.id = lk.created_by
      LEFT JOIN users u2 ON u2.id = lk.used_by
      ORDER BY lk.created_at DESC
    `)

    if (keys.length === 0) {
      console.log('📋 Ключей в системе нет\n')
      return
    }

    console.log('\n📋 Все лицензионные ключи в системе:\n')
    console.log('─'.repeat(100))
    console.log('ID'.padEnd(5), '│', 'КЛЮЧ'.padEnd(15), '│', 'ТИП'.padEnd(10), '│', 'СТАТУС'.padEnd(15), '│', 'СОЗДАЛ'.padEnd(15), '│', 'ИСПОЛЬЗОВАЛ')
    console.log('─'.repeat(100))

    keys.forEach((k) => {
      const id = k.id.toString().padEnd(5)
      const key = k.key.padEnd(15)
      const type = (k.subscriptionType || 'Basic').padEnd(10)
      const status = (k.used ? '❌ Использован' : '✅ Доступен').padEnd(15)
      const createdBy = (k.createdBy || 'N/A').padEnd(15)
      const usedBy = k.usedBy || '-'
      
      console.log(id, '│', key, '│', type, '│', status, '│', createdBy, '│', usedBy)
    })

    console.log('─'.repeat(100))
    
    // Статистика
    const total = keys.length
    const used = keys.filter(k => k.used).length
    const available = total - used
    
    const basicKeys = keys.filter(k => k.subscriptionType === 'Basic')
    const plusKeys = keys.filter(k => k.subscriptionType === 'Plus')
    const lifetimeKeys = keys.filter(k => k.subscriptionType === 'Lifetime')
    
    console.log('\n📊 Статистика:')
    console.log(`   Всего ключей: ${total}`)
    console.log(`   Доступно: ${available}`)
    console.log(`   Использовано: ${used}`)
    console.log('\n   По типам:')
    console.log(`   - Basic (30 дней): ${basicKeys.length} (доступно: ${basicKeys.filter(k => !k.used).length})`)
    console.log(`   - Plus (90 дней): ${plusKeys.length} (доступно: ${plusKeys.filter(k => !k.used).length})`)
    console.log(`   - Lifetime (навсегда): ${lifetimeKeys.length} (доступно: ${lifetimeKeys.filter(k => !k.used).length})`)
    console.log()

  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  } finally {
    process.exit(0)
  }
}

showKeys()
