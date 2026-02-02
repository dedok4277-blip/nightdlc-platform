import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

async function syncDatabases() {
  if (!process.env.DATABASE_URL_PRIMARY || !process.env.DATABASE_URL_REPLICA) {
    console.log('❌ Не найдены DATABASE_URL_PRIMARY и DATABASE_URL_REPLICA в .env')
    console.log('\nДобавьте в .env:')
    console.log('DATABASE_URL_PRIMARY=postgresql://...')
    console.log('DATABASE_URL_REPLICA=postgresql://...')
    process.exit(1)
  }

  const primaryPool = new Pool({
    connectionString: process.env.DATABASE_URL_PRIMARY,
    ssl: { rejectUnauthorized: false }
  })

  const replicaPool = new Pool({
    connectionString: process.env.DATABASE_URL_REPLICA,
    ssl: { rejectUnauthorized: false }
  })

  console.log('🔄 Начало синхронизации баз данных...\n')

  try {
    // Синхронизация пользователей
    console.log('👥 Синхронизация пользователей...')
    const users = await primaryPool.query('SELECT * FROM users ORDER BY id')
    
    for (const user of users.rows) {
      await replicaPool.query(`
        INSERT INTO users (id, uid, username, email, password_hash, avatar_url, 
                          is_admin, license_key, created_at, last_login, plan, 
                          status, subscription_tier, subscription_expires_at, hwid)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          uid = EXCLUDED.uid,
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
    }
    console.log(`   ✅ Синхронизировано: ${users.rows.length} пользователей\n`)

    // Синхронизация постов
    console.log('📝 Синхронизация постов...')
    const posts = await primaryPool.query('SELECT * FROM posts ORDER BY id')
    
    for (const post of posts.rows) {
      await replicaPool.query(`
        INSERT INTO posts (id, user_id, server, title, description, 
                          screenshot_path, download_url, view_count, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          server = EXCLUDED.server,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          screenshot_path = EXCLUDED.screenshot_path,
          download_url = EXCLUDED.download_url,
          view_count = EXCLUDED.view_count,
          created_at = EXCLUDED.created_at
      `, [
        post.id, post.user_id, post.server, post.title, post.description,
        post.screenshot_path, post.download_url, post.view_count, post.created_at
      ])
    }
    console.log(`   ✅ Синхронизировано: ${posts.rows.length} постов\n`)

    // Синхронизация лайков
    console.log('❤️  Синхронизация лайков...')
    const likes = await primaryPool.query('SELECT * FROM post_likes ORDER BY id')
    
    for (const like of likes.rows) {
      await replicaPool.query(`
        INSERT INTO post_likes (id, user_id, post_id, created_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          post_id = EXCLUDED.post_id,
          created_at = EXCLUDED.created_at
      `, [like.id, like.user_id, like.post_id, like.created_at])
    }
    console.log(`   ✅ Синхронизировано: ${likes.rows.length} лайков\n`)

    // Синхронизация лицензионных ключей
    console.log('🔑 Синхронизация лицензионных ключей...')
    const keys = await primaryPool.query('SELECT * FROM license_keys ORDER BY id')
    
    for (const key of keys.rows) {
      await replicaPool.query(`
        INSERT INTO license_keys (id, key, used, created_at, created_by, used_at, used_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          key = EXCLUDED.key,
          used = EXCLUDED.used,
          created_at = EXCLUDED.created_at,
          created_by = EXCLUDED.created_by,
          used_at = EXCLUDED.used_at,
          used_by = EXCLUDED.used_by
      `, [key.id, key.key, key.used, key.created_at, key.created_by, key.used_at, key.used_by])
    }
    console.log(`   ✅ Синхронизировано: ${keys.rows.length} ключей\n`)

    // Обновляем sequences (автоинкремент)
    console.log('🔢 Обновление sequences...')
    
    const sequences = ['users_id_seq', 'posts_id_seq', 'post_likes_id_seq', 'license_keys_id_seq']
    
    for (const seq of sequences) {
      const tableName = seq.replace('_id_seq', '')
      const maxId = await primaryPool.query(`SELECT MAX(id) as max_id FROM ${tableName}`)
      const maxIdValue = maxId.rows[0]?.max_id || 0
      
      if (maxIdValue > 0) {
        await replicaPool.query(`SELECT setval('${seq}', ${maxIdValue})`)
        console.log(`   ✅ ${seq}: ${maxIdValue}`)
      }
    }

    console.log('\n✅ Синхронизация завершена успешно!')
    console.log(`\n📊 Статистика:`)
    console.log(`   Пользователей: ${users.rows.length}`)
    console.log(`   Постов: ${posts.rows.length}`)
    console.log(`   Лайков: ${likes.rows.length}`)
    console.log(`   Ключей: ${keys.rows.length}`)

  } catch (error) {
    console.error('\n❌ Ошибка синхронизации:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await primaryPool.end()
    await replicaPool.end()
  }
}

// Запуск синхронизации
syncDatabases()
