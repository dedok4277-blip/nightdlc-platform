import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function testConnection() {
  console.log('🔍 Тестирование подключения к MySQL...\n')
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cz505339_nelondlc',
    port: process.env.DB_PORT || 3306
  }
  
  console.log('📋 Конфигурация:')
  console.log(`   Host: ${config.host}`)
  console.log(`   User: ${config.user}`)
  console.log(`   Password: ${config.password ? '***' : '(пусто)'}`)
  console.log(`   Database: ${config.database}`)
  console.log(`   Port: ${config.port}\n`)
  
  try {
    console.log('⏳ Подключение...')
    const connection = await mysql.createConnection(config)
    console.log('✅ Подключение успешно!\n')
    
    console.log('📊 Проверка базы данных...')
    const [tables] = await connection.query('SHOW TABLES')
    
    if (tables.length === 0) {
      console.log('⚠️  База данных пустая (таблицы будут созданы при первом запуске)')
    } else {
      console.log(`✅ Найдено таблиц: ${tables.length}`)
      tables.forEach(table => {
        const tableName = Object.values(table)[0]
        console.log(`   - ${tableName}`)
      })
    }
    
    await connection.end()
    console.log('\n✅ Тест завершен успешно!')
    console.log('\n💡 Следующий шаг: запустите приложение с MySQL')
    console.log('   node server/index-mysql.js')
    
  } catch (error) {
    console.error('\n❌ Ошибка подключения:')
    console.error(`   ${error.message}\n`)
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Решение: Убедитесь, что MySQL запущен')
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Решение: Проверьте логин/пароль в файле .env')
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('💡 Решение: База данных не существует. Создайте её в phpMyAdmin')
    }
    
    process.exit(1)
  }
}

testConnection()
