# Миграция на MySQL

## Шаг 1: Настройка базы данных

1. Откройте phpMyAdmin по адресу: http://localhost/phpmyadmin
2. База данных `cz505339_nelondlc` уже создана
3. Убедитесь, что у пользователя `root` есть доступ к этой базе

## Шаг 2: Настройка .env файла

Файл `.env` уже создан с настройками по умолчанию:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=cz505339_nelondlc
DB_PORT=3306
```

**ВАЖНО:** Если у вашего MySQL пользователя root есть пароль, обновите `DB_PASSWORD` в файле `.env`

## Шаг 3: Резервное копирование данных SQLite (опционально)

Если у вас есть важные данные в SQLite базе (`nightdlc.db`), сохраните файл:

```bash
copy nightdlc.db nightdlc.db.backup
```

## Шаг 4: Переключение на MySQL

### Вариант A: Полная замена (рекомендуется)

1. Переименуйте старый файл:
```bash
move server\index.js server\index-sqlite.js
```

2. Переименуйте новый файл:
```bash
move server\index-mysql.js server\index.js
```

3. Переименуйте файл базы данных:
```bash
move server\db.js server\db-sqlite.js
move server\db-mysql.js server\db.js
```

### Вариант B: Тестирование (безопасный)

Запустите MySQL версию напрямую:
```bash
node server/index-mysql.js
```

## Шаг 5: Запуск приложения

```bash
npm start
```

При первом запуске:
- Автоматически создадутся все таблицы в MySQL
- Будет создан администратор: `admin` / `admin`

## Шаг 6: Проверка

1. Откройте http://localhost:5173
2. Войдите как admin / admin
3. Проверьте работу всех функций

## Структура таблиц MySQL

### users
- Пользователи системы
- Поддержка подписок (Basic, Plus, Elite)
- HWID привязка

### posts
- Посты на форуме
- Связь с пользователями

### post_likes
- Лайки постов

### license_keys
- Лицензионные ключи
- Отслеживание использования

## Отличия от SQLite

1. **Производительность**: MySQL быстрее на больших объемах данных
2. **Concurrent Access**: MySQL лучше работает с множественными подключениями
3. **Типы данных**: 
   - INTEGER → INT
   - TEXT → VARCHAR/TEXT
   - BIGINT для timestamp
4. **Foreign Keys**: Автоматический CASCADE для удаления связанных записей

## Возврат к SQLite

Если нужно вернуться к SQLite:

```bash
move server\index.js server\index-mysql.js
move server\index-sqlite.js server\index.js
move server\db.js server\db-mysql.js
move server\db-sqlite.js server\db.js
```

## Миграция данных из SQLite в MySQL

Если нужно перенести существующие данные, используйте скрипт миграции (создам отдельно по запросу).

## Troubleshooting

### Ошибка подключения к MySQL
- Проверьте, что MySQL запущен
- Проверьте настройки в `.env`
- Убедитесь, что база данных существует

### Ошибка "Access denied"
- Проверьте пароль в `.env`
- Убедитесь, что у пользователя есть права на базу

### Таблицы не создаются
- Проверьте права пользователя MySQL
- Посмотрите логи в консоли при запуске
