import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

async function testConnection() {
  console.log('🔍 Проверка подключения к PostgreSQL...\n')
  
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL не найден в .env файле')
    console.log('📝 Добавьте строку подключения в .env:')
    console.log('   DATABASE_URL=postgresql://user:pass@host:5432/database')
    process.exit(1)
  }
  
  console.log('📍 DATABASE_URL найден')
  console.log(`   ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`)
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })
  
  try {
    console.log('🔌 Подключение к базе данных...')
    const client = await pool.connect()
    console.log('✅ Подключение успешно!\n')
    
    console.log('📊 Информация о базе данных:')
    const versionResult = await client.query('SELECT version()')
    console.log(`   PostgreSQL: ${versionResult.rows[0].version.split(',')[0]}\n`)
    
    console.log('📋 Проверка таблиц:')
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    
    if (tablesResult.rows.length === 0) {
      console.log('   ⚠️  Таблицы не найдены (будут созданы при первом запуске сервера)')
    } else {
      console.log('   Найдено таблиц:', tablesResult.rows.length)
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`)
      })
    }
    
    console.log('\n✅ Тест завершен успешно!')
    
    client.release()
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Ошибка подключения:')
    console.error('   ', error.message)
    
    if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Проверьте:')
      console.log('   - Правильность хоста в DATABASE_URL')
      console.log('   - Доступность базы данных из вашей сети')
    } else if (error.code === '28P01') {
      console.log('\n💡 Неверный пароль или имя пользователя')
    } else if (error.code === '3D000') {
      console.log('\n💡 База данных не существует')
    }
    
    await pool.end()
    process.exit(1)
  }
}

testConnection()
