import dotenv from 'dotenv'
dotenv.config()

import pool, { pgPool, mysqlPool } from './server/db-dual.js'

async function testDualDatabase() {
  console.log('\n🧪 Testing Dual Database Configuration\n')
  console.log('=' .repeat(50))
  
  // Проверка PostgreSQL
  if (pgPool) {
    try {
      const result = await pgPool.query('SELECT COUNT(*) as count FROM users')
      console.log('✅ PostgreSQL (Render):')
      console.log(`   Users: ${result.rows[0].count}`)
      
      const version = await pgPool.query('SELECT version()')
      console.log(`   Version: ${version.rows[0].version.split(' ')[0]} ${version.rows[0].version.split(' ')[1]}`)
    } catch (error) {
      console.log('❌ PostgreSQL Error:', error.message)
    }
  } else {
    console.log('⚠️  PostgreSQL: Not configured')
  }
  
  console.log('=' .repeat(50))
  
  // Проверка MySQL
  if (mysqlPool) {
    try {
      const [rows] = await mysqlPool.execute('SELECT COUNT(*) as count FROM users')
      console.log('✅ MySQL (XAMPP):')
      console.log(`   Users: ${rows[0].count}`)
      
      const [version] = await mysqlPool.execute('SELECT VERSION() as version')
      console.log(`   Version: MySQL ${version[0].version}`)
    } catch (error) {
      console.log('❌ MySQL Error:', error.message)
    }
  } else {
    console.log('⚠️  MySQL: Not configured')
  }
  
  console.log('=' .repeat(50))
  
  // Проверка основной БД
  console.log(`\n📊 Primary Database: ${process.env.PRIMARY_DB || 'postgres'}`)
  console.log(`🔄 Sync Enabled: ${process.env.SYNC_DATABASES === 'true' ? 'Yes' : 'No'}`)
  
  // Тест запроса через адаптер
  try {
    const [users] = await pool.query('SELECT COUNT(*) as count FROM users')
    console.log(`\n✅ Adapter Query Test: ${users[0].count} users found`)
  } catch (error) {
    console.log('\n❌ Adapter Query Error:', error.message)
  }
  
  console.log('\n' + '=' .repeat(50))
  console.log('✅ Dual database test completed!\n')
  
  process.exit(0)
}

testDualDatabase().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
