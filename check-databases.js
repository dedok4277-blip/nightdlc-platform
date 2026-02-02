import dotenv from 'dotenv'
dotenv.config()

import { pgPool, mysqlPool } from './server/db-dual.js'

async function checkDatabases() {
  console.log('\n' + '='.repeat(60))
  console.log('📊 DATABASE STATUS CHECK')
  console.log('='.repeat(60) + '\n')
  
  const stats = {
    postgres: { connected: false, users: 0, posts: 0, keys: 0 },
    mysql: { connected: false, users: 0, posts: 0, keys: 0 }
  }
  
  // Проверка PostgreSQL
  if (pgPool) {
    try {
      const users = await pgPool.query('SELECT COUNT(*) as count FROM users')
      const posts = await pgPool.query('SELECT COUNT(*) as count FROM posts')
      const keys = await pgPool.query('SELECT COUNT(*) as count FROM license_keys')
      
      stats.postgres.connected = true
      stats.postgres.users = parseInt(users.rows[0].count)
      stats.postgres.posts = parseInt(posts.rows[0].count)
      stats.postgres.keys = parseInt(keys.rows[0].count)
      
      console.log('✅ PostgreSQL (Render)')
      console.log(`   Status: Connected`)
      console.log(`   Users: ${stats.postgres.users}`)
      console.log(`   Posts: ${stats.postgres.posts}`)
      console.log(`   License Keys: ${stats.postgres.keys}`)
      
      // Последний пользователь
      const lastUser = await pgPool.query('SELECT username, created_at FROM users ORDER BY created_at DESC LIMIT 1')
      if (lastUser.rows.length > 0) {
        const date = new Date(parseInt(lastUser.rows[0].created_at))
        console.log(`   Last User: ${lastUser.rows[0].username} (${date.toLocaleString('ru-RU')})`)
      }
    } catch (error) {
      console.log('❌ PostgreSQL (Render)')
      console.log(`   Status: Error - ${error.message}`)
    }
  } else {
    console.log('⚠️  PostgreSQL (Render)')
    console.log('   Status: Not configured (DATABASE_URL not set)')
  }
  
  console.log('\n' + '-'.repeat(60) + '\n')
  
  // Проверка MySQL
  if (mysqlPool) {
    try {
      const [users] = await mysqlPool.execute('SELECT COUNT(*) as count FROM users')
      const [posts] = await mysqlPool.execute('SELECT COUNT(*) as count FROM posts')
      const [keys] = await mysqlPool.execute('SELECT COUNT(*) as count FROM license_keys')
      
      stats.mysql.connected = true
      stats.mysql.users = parseInt(users[0].count)
      stats.mysql.posts = parseInt(posts[0].count)
      stats.mysql.keys = parseInt(keys[0].count)
      
      console.log('✅ MySQL (XAMPP)')
      console.log(`   Status: Connected`)
      console.log(`   Users: ${stats.mysql.users}`)
      console.log(`   Posts: ${stats.mysql.posts}`)
      console.log(`   License Keys: ${stats.mysql.keys}`)
      
      // Последний пользователь
      const [lastUser] = await mysqlPool.execute('SELECT username, created_at FROM users ORDER BY created_at DESC LIMIT 1')
      if (lastUser.length > 0) {
        const date = new Date(parseInt(lastUser[0].created_at))
        console.log(`   Last User: ${lastUser[0].username} (${date.toLocaleString('ru-RU')})`)
      }
    } catch (error) {
      console.log('❌ MySQL (XAMPP)')
      console.log(`   Status: Error - ${error.message}`)
    }
  } else {
    console.log('⚠️  MySQL (XAMPP)')
    console.log('   Status: Not configured (XAMPP_ENABLED=false)')
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('⚙️  CONFIGURATION')
  console.log('='.repeat(60) + '\n')
  
  console.log(`Primary Database: ${process.env.PRIMARY_DB || 'postgres'}`)
  console.log(`Sync Enabled: ${process.env.SYNC_DATABASES === 'true' ? 'Yes' : 'No'}`)
  console.log(`XAMPP Enabled: ${process.env.XAMPP_ENABLED === 'true' ? 'Yes' : 'No'}`)
  
  // Проверка синхронизации
  if (stats.postgres.connected && stats.mysql.connected) {
    console.log('\n' + '='.repeat(60))
    console.log('🔄 SYNC STATUS')
    console.log('='.repeat(60) + '\n')
    
    const usersDiff = Math.abs(stats.postgres.users - stats.mysql.users)
    const postsDiff = Math.abs(stats.postgres.posts - stats.mysql.posts)
    const keysDiff = Math.abs(stats.postgres.keys - stats.mysql.keys)
    
    if (usersDiff === 0 && postsDiff === 0 && keysDiff === 0) {
      console.log('✅ Databases are in sync!')
    } else {
      console.log('⚠️  Databases are out of sync:')
      if (usersDiff > 0) console.log(`   Users difference: ${usersDiff}`)
      if (postsDiff > 0) console.log(`   Posts difference: ${postsDiff}`)
      if (keysDiff > 0) console.log(`   Keys difference: ${keysDiff}`)
      console.log('\n   Run: node sync-dual-databases.js')
    }
  }
  
  console.log('\n' + '='.repeat(60) + '\n')
  
  process.exit(0)
}

checkDatabases().catch(error => {
  console.error('\n❌ Fatal error:', error.message)
  process.exit(1)
})
