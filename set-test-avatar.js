import pool from './server/db-dual.js'

async function setTestAvatar() {
  try {
    console.log('🎨 Установка тестовой аватарки...\n')
    
    // Получаем первого пользователя
    const [users] = await pool.execute('SELECT id, uid, username, avatar_url FROM users LIMIT 1')
    
    if (users.length === 0) {
      console.log('❌ В базе данных нет пользователей')
      process.exit(1)
    }
    
    const user = users[0]
    console.log(`👤 Пользователь: ${user.username} (UID: ${user.uid})`)
    console.log(`   Текущая аватарка: ${user.avatar_url || 'не установлена'}`)
    console.log()
    
    // Варианты тестовых аватарок
    const testAvatars = [
      'https://i.imgur.com/placeholder.png', // Замените на реальный URL
      'https://via.placeholder.com/128',
      '/uploads/default-avatar.png'
    ]
    
    console.log('📋 Доступные варианты:')
    console.log('   1. Использовать URL из Imgur или другого хостинга')
    console.log('   2. Использовать placeholder (via.placeholder.com)')
    console.log('   3. Загрузить файл в папку uploads/')
    console.log()
    
    // Для примера используем placeholder
    const newAvatarUrl = 'https://via.placeholder.com/128/4A90E2/FFFFFF?text=Avatar'
    
    console.log(`🔄 Устанавливаем аватарку: ${newAvatarUrl}`)
    
    await pool.execute(
      'UPDATE users SET avatar_url = ? WHERE id = ?',
      [newAvatarUrl, user.id]
    )
    
    console.log('✅ Аватарка установлена!')
    console.log()
    console.log('🌐 Проверьте через API:')
    console.log(`   curl https://nelondlc.onrender.com/api/user/${user.uid}`)
    console.log()
    console.log('💡 Для установки своей аватарки:')
    console.log('   1. Загрузите изображение на imgur.com или другой хостинг')
    console.log('   2. Скопируйте прямую ссылку на изображение')
    console.log('   3. Выполните SQL: UPDATE users SET avatar_url = "URL" WHERE uid = "UID"')
    console.log()
    console.log('📝 Или загрузите через веб-интерфейс:')
    console.log('   1. Войдите на сайт')
    console.log('   2. Перейдите в настройки профиля')
    console.log('   3. Загрузите изображение')
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

setTestAvatar()
