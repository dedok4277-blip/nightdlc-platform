import pool from './server/db-dual.js'

async function testUserAPI() {
  try {
    console.log('🔍 Тестирование API получения пользователя...\n')
    
    // Получаем первого пользователя из базы
    const [users] = await pool.execute('SELECT uid, username, avatar_url, is_admin FROM users LIMIT 1')
    
    if (users.length === 0) {
      console.log('❌ В базе данных нет пользователей')
      process.exit(1)
    }
    
    const testUser = users[0]
    console.log('📋 Тестовый пользователь:')
    console.log(`   UID: ${testUser.uid}`)
    console.log(`   Username: ${testUser.username}`)
    console.log(`   Avatar URL: ${testUser.avatar_url || 'не установлен'}`)
    console.log(`   Is Admin: ${testUser.is_admin ? 'да' : 'нет'}`)
    console.log()
    
    // Формируем ответ как в API
    const apiResponse = {
      username: testUser.username,
      uid: testUser.uid,
      isAdmin: !!testUser.is_admin,
      avatarUrl: testUser.avatar_url || null
    }
    
    console.log('✅ Ожидаемый ответ API:')
    console.log(JSON.stringify(apiResponse, null, 2))
    console.log()
    
    console.log('🌐 Для тестирования из клиента используйте:')
    console.log(`   URL: http://localhost:5173/api/user/${testUser.uid}`)
    console.log()
    
    console.log('💡 Пример использования в Java клиенте:')
    console.log(`   WebsiteAPI.loadUserData("${testUser.uid}");`)
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

testUserAPI()
