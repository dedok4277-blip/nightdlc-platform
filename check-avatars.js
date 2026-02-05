import pool from './server/db-dual.js'

async function checkAvatars() {
  try {
    console.log('🔍 Проверка аватарок пользователей...\n')
    
    // Получаем всех пользователей
    const [users] = await pool.execute('SELECT uid, username, avatar_url FROM users LIMIT 10')
    
    if (users.length === 0) {
      console.log('❌ В базе данных нет пользователей')
      process.exit(1)
    }
    
    console.log(`📋 Найдено пользователей: ${users.length}\n`)
    
    for (const user of users) {
      console.log(`👤 ${user.username} (UID: ${user.uid})`)
      
      if (user.avatar_url) {
        // Формируем полный URL
        let fullUrl = user.avatar_url
        if (user.avatar_url.startsWith('/')) {
          fullUrl = `https://nelondlc.onrender.com${user.avatar_url}`
        } else if (!user.avatar_url.startsWith('http')) {
          fullUrl = `https://nelondlc.onrender.com/${user.avatar_url}`
        }
        
        console.log(`   ✅ Аватарка: ${fullUrl}`)
      } else {
        console.log(`   ⚠️  Аватарка не установлена`)
      }
      console.log()
    }
    
    // Проверяем API эндпоинт для первого пользователя
    if (users.length > 0) {
      const testUser = users[0]
      console.log('🌐 Тест API эндпоинта:')
      console.log(`   GET https://nelondlc.onrender.com/api/user/${testUser.uid}`)
      console.log()
      console.log('💡 Для тестирования выполните:')
      console.log(`   curl https://nelondlc.onrender.com/api/user/${testUser.uid}`)
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

checkAvatars()
