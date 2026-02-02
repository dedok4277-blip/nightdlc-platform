# 🚀 Шпаргалка: Две базы данных

## ⚡ Быстрая настройка (3 шага)

### 1️⃣ Настройте .env
```env
DATABASE_URL=postgresql://user:pass@host/db
XAMPP_ENABLED=true
PRIMARY_DB=postgres
SYNC_DATABASES=true
```

### 2️⃣ Измените server/index.js
```javascript
import pool, { nextUid } from './db-dual.js'  // Было: './db-adapter.js'
```

### 3️⃣ Создайте БД в phpMyAdmin
- Откройте http://localhost/phpmyadmin
- Создайте базу `nelondlc`

---

## 🎮 Команды

```bash
npm run test:dual    # Тест подключения
npm run check:db     # Проверка статуса
npm run sync:dual    # Синхронизация
npm start            # Запуск сервера
```

---

## 📊 Режимы

### Render главная (продакшен)
```env
PRIMARY_DB=postgres
SYNC_DATABASES=true
```

### XAMPP главная (разработка)
```env
PRIMARY_DB=mysql
SYNC_DATABASES=true
```

---

## 🔍 Проверка

```bash
npm run check:db
```

Ожидаемый результат:
```
✅ PostgreSQL (Render): Connected
✅ MySQL (XAMPP): Connected
✅ Databases are in sync!
```

---

## 📁 Файлы

| Файл | Описание |
|------|----------|
| `server/db-dual.js` | Адаптер для двух БД |
| `.env.dual-example` | Пример конфигурации |
| `test-dual-db.js` | Тест подключения |
| `check-databases.js` | Проверка статуса |
| `sync-dual-databases.js` | Синхронизация |

---

## 📖 Документация

| Файл | Для кого |
|------|----------|
| `ДВОЙНАЯ-БД.md` | Быстрый старт (RU) |
| `DUAL-DB-QUICKSTART.md` | Быстрый старт (EN) |
| `DUAL-DATABASE-SETUP.md` | Подробная инструкция |
| `CHECKLIST-DUAL-DB.md` | Чеклист настройки |
| `DUAL-DB-DIAGRAM.txt` | Схема архитектуры |

---

## ⚠️ Важно

- Синхронизация односторонняя (главная → вторая)
- Не редактируйте вторую БД напрямую
- Ошибки синхронизации не критичны

---

## 🔧 Проблемы

### PostgreSQL не подключается
```bash
# Проверьте DATABASE_URL в .env
npm run test:postgres
```

### MySQL не подключается
```bash
# Запустите XAMPP → MySQL
# Откройте phpMyAdmin
# Создайте базу nelondlc
```

### Не синхронизируется
```bash
# Проверьте SYNC_DATABASES=true
npm run sync:dual
```

---

## 🎯 Конфигурация

```env
# PostgreSQL (Render)
DATABASE_URL=postgresql://...

# MySQL (XAMPP)
XAMPP_ENABLED=true
XAMPP_HOST=localhost
XAMPP_USER=root
XAMPP_PASSWORD=
XAMPP_DB_NAME=nelondlc
XAMPP_PORT=3306

# Настройки
PRIMARY_DB=postgres        # postgres или mysql
SYNC_DATABASES=true        # true или false
```

---

## ✅ Чеклист

- [ ] Скопировали `.env.dual-example` в `.env`
- [ ] Заполнили `DATABASE_URL`
- [ ] Настроили параметры XAMPP
- [ ] Изменили импорт в `server/index.js`
- [ ] Создали БД `nelondlc` в phpMyAdmin
- [ ] Выполнили `npm run test:dual`
- [ ] Выполнили `npm run check:db`
- [ ] Запустили `npm start`
- [ ] Обе БД подключены ✅

---

**Готово! Система работает с двумя БД! 🎉**
