import dotenv from 'dotenv'
dotenv.config()

import { pgPool, mysqlPool } from './server/db-dual.js'

async function syncDatabases() {
  console.log('\n🔄 Starting database synchronization...\n')
  
  if (!pgPool || !mysqlPool) {
    console.error('❌ Both databases must be configured for sync')
    process.exit(1)
  }
  
  const direction = process.env.PRIMARY_DB === 'mysql' ? 'mysql-to-postgres' : 'postgres-to-mysql'
  console.log(`📊 Sync direction: ${direction}`)
  console.log('=' .repeat(50))
  
  try {
    if (direction === 'postgres-to-mysql') {
      await syncPostgresToMySQL()
    } else {
      await syncMySQLToPostgres()
    }
    
    console.log('\n✅ Synchronization completed successfully!\n')
  } catch (error) {
    console.error('\n❌ Synchronization failed:', error.message)
    process.exit(1)
  }
  
  process.exit(0)
}

async function syncPostgresToMySQL() {
  console.log('\n📤 Syncing PostgreSQL → MySQL\n')
  
  // Синхронизация пользователей
  console.log('👥 Syncing users...')
  const pgUsers = await pgPool.query('SELECT * FROM users ORDER BY id')
  
  for (const user of pgUsers.rows) {
    try {
      await mysqlPool.execute(`
        INSERT INTO users (id, uid, username, email, password_hash, avatar_url, is_admin, 
                          license_key, created_at, last_login, plan, status, 
                          subscription_tier, subscription_expires_at, hwid)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          username = VALUES(username),
          email = VALUES(email),
          password_hash = VALUES(password_hash),
          avatar_url = VALUES(avatar_url),
          is_admin = VALUES(is_admin),
          license_key = VALUES(license_key),
          last_login = VALUES(last_login),
          plan = VALUES(plan),
          status = VALUES(status),
          subscription_tier = VALUES(subscription_tier),
          subscription_expires_at = VALUES(subscription_expires_at),
          hwid = VALUES(hwid)
      `, [
        user.id, user.uid, user.username, user.email, user.password_hash,
        user.avatar_url, user.is_admin, user.license_key, user.created_at,
        user.last_login, user.plan, user.status, user.subscription_tier,
        user.subscription_expires_at, user.hwid
      ])
    } catch (error) {
      console.warn(`   ⚠️  User ${user.username}: ${error.message}`)
    }
  }
  console.log(`   ✅ ${pgUsers.rows.length} users synced`)
  
  // Синхронизация постов
  console.log('📝 Syncing posts...')
  const pgPosts = await pgPool.query('SELECT * FROM posts ORDER BY id')
  
  for (const post of pgPosts.rows) {
    try {
      await mysqlPool.execute(`
        INSERT INTO posts (id, user_id, server, title, description, screenshot_path, 
                          download_url, view_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          user_id = VALUES(user_id),
          server = VALUES(server),
          title = VALUES(title),
          description = VALUES(description),
          screenshot_path = VALUES(screenshot_path),
          download_url = VALUES(download_url),
          view_count = VALUES(view_count)
      `, [
        post.id, post.user_id, post.server, post.title, post.description,
        post.screenshot_path, post.download_url, post.view_count, post.created_at
      ])
    } catch (error) {
      console.warn(`   ⚠️  Post ${post.id}: ${error.message}`)
    }
  }
  console.log(`   ✅ ${pgPosts.rows.length} posts synced`)
  
  // Синхронизация лайков
  console.log('❤️  Syncing likes...')
  const pgLikes = await pgPool.query('SELECT * FROM post_likes')
  
  // Очищаем старые лайки
  await mysqlPool.execute('DELETE FROM post_likes')
  
  for (const like of pgLikes.rows) {
    try {
      await mysqlPool.execute(`
        INSERT INTO post_likes (user_id, post_id, created_at)
        VALUES (?, ?, ?)
      `, [like.user_id, like.post_id, like.created_at])
    } catch (error) {
      console.warn(`   ⚠️  Like: ${error.message}`)
    }
  }
  console.log(`   ✅ ${pgLikes.rows.length} likes synced`)
  
  // Синхронизация ключей
  console.log('🔑 Syncing license keys...')
  const pgKeys = await pgPool.query('SELECT * FROM license_keys ORDER BY id')
  
  for (const key of pgKeys.rows) {
    try {
      await mysqlPool.execute(`
        INSERT INTO license_keys (id, \`key\`, used, created_at, created_by, used_at, used_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          used = VALUES(used),
          used_at = VALUES(used_at),
          used_by = VALUES(used_by)
      `, [
        key.id, key.key, key.used, key.created_at, key.created_by,
        key.used_at, key.used_by
      ])
    } catch (error) {
      console.warn(`   ⚠️  Key ${key.key}: ${error.message}`)
    }
  }
  console.log(`   ✅ ${pgKeys.rows.length} keys synced`)
}

async function syncMySQLToPostgres() {
  console.log('\n📤 Syncing MySQL → PostgreSQL\n')
  
  // Синхронизация пользователей
  console.log('👥 Syncing users...')
  const [mysqlUsers] = await mysqlPool.execute('SELECT * FROM users ORDER BY id')
  
  for (const user of mysqlUsers) {
    try {
      await pgPool.query(`
        INSERT INTO users (id, uid, username, email, password_hash, avatar_url, is_admin,
                          license_key, created_at, last_login, plan, status,
                          subscription_tier, subscription_expires_at, hwid)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          avatar_url = EXCLUDED.avatar_url,
          is_admin = EXCLUDED.is_admin,
          license_key = EXCLUDED.license_key,
          last_login = EXCLUDED.last_login,
          plan = EXCLUDED.plan,
          status = EXCLUDED.status,
          subscription_tier = EXCLUDED.subscription_tier,
          subscription_expires_at = EXCLUDED.subscription_expires_at,
          hwid = EXCLUDED.hwid
      `, [
        user.id, user.uid, user.username, user.email, user.password_hash,
        user.avatar_url, user.is_admin, user.license_key, user.created_at,
        user.last_login, user.plan, user.status, user.subscription_tier,
        user.subscription_expires_at, user.hwid
      ])
    } catch (error) {
      console.warn(`   ⚠️  User ${user.username}: ${error.message}`)
    }
  }
  console.log(`   ✅ ${mysqlUsers.length} users synced`)
  
  // Синхронизация постов
  console.log('📝 Syncing posts...')
  const [mysqlPosts] = await mysqlPool.execute('SELECT * FROM posts ORDER BY id')
  
  for (const post of mysqlPosts) {
    try {
      await pgPool.query(`
        INSERT INTO posts (id, user_id, server, title, description, screenshot_path,
                          download_url, view_count, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          server = EXCLUDED.server,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          screenshot_path = EXCLUDED.screenshot_path,
          download_url = EXCLUDED.download_url,
          view_count = EXCLUDED.view_count
      `, [
        post.id, post.user_id, post.server, post.title, post.description,
        post.screenshot_path, post.download_url, post.view_count, post.created_at
      ])
    } catch (error) {
      console.warn(`   ⚠️  Post ${post.id}: ${error.message}`)
    }
  }
  console.log(`   ✅ ${mysqlPosts.length} posts synced`)
  
  // Синхронизация лайков
  console.log('❤️  Syncing likes...')
  const [mysqlLikes] = await mysqlPool.execute('SELECT * FROM post_likes')
  
  // Очищаем старые лайки
  await pgPool.query('DELETE FROM post_likes')
  
  for (const like of mysqlLikes) {
    try {
      await pgPool.query(`
        INSERT INTO post_likes (user_id, post_id, created_at)
        VALUES ($1, $2, $3)
      `, [like.user_id, like.post_id, like.created_at])
    } catch (error) {
      console.warn(`   ⚠️  Like: ${error.message}`)
    }
  }
  console.log(`   ✅ ${mysqlLikes.length} likes synced`)
  
  // Синхронизация ключей
  console.log('🔑 Syncing license keys...')
  const [mysqlKeys] = await mysqlPool.execute('SELECT * FROM license_keys ORDER BY id')
  
  for (const key of mysqlKeys) {
    try {
      await pgPool.query(`
        INSERT INTO license_keys (id, key, used, created_at, created_by, used_at, used_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          used = EXCLUDED.used,
          used_at = EXCLUDED.used_at,
          used_by = EXCLUDED.used_by
      `, [
        key.id, key.key, key.used, key.created_at, key.created_by,
        key.used_at, key.used_by
      ])
    } catch (error) {
      console.warn(`   ⚠️  Key ${key.key}: ${error.message}`)
    }
  }
  console.log(`   ✅ ${mysqlKeys.length} keys synced`)
}

syncDatabases()
