// Адаптер для совместимости SQLite API с MySQL
import pool from './db-mysql.js'

class MySQLAdapter {
  constructor(pool) {
    this.pool = pool
  }

  // Метод prepare возвращает объект с методами run, get, all
  prepare(sql) {
    const self = this
    
    return {
      async run(...params) {
        const [result] = await self.pool.execute(sql, params)
        return {
          changes: result.affectedRows,
          lastInsertRowid: result.insertId
        }
      },
      
      async get(...params) {
        const [rows] = await self.pool.execute(sql, params)
        return rows[0] || null
      },
      
      async all(...params) {
        const [rows] = await self.pool.execute(sql, params)
        return rows
      }
    }
  }

  // Метод exec для выполнения множественных запросов
  async exec(sql) {
    const connection = await this.pool.getConnection()
    try {
      await connection.query(sql)
    } finally {
      connection.release()
    }
  }

  // Метод transaction для транзакций
  transaction(fn) {
    return async () => {
      const connection = await this.pool.getConnection()
      try {
        await connection.beginTransaction()
        await fn()
        await connection.commit()
      } catch (error) {
        await connection.rollback()
        throw error
      } finally {
        connection.release()
      }
    }
  }

  // Метод pragma (не используется в MySQL, но нужен для совместимости)
  pragma() {
    // MySQL не использует pragma
  }
}

export default new MySQLAdapter(pool)
