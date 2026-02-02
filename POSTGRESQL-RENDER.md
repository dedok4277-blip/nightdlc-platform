# Подключение PostgreSQL базы данных Render

## Быстрая настройка

### 1. Получите строку подключения

В вашей базе данных **nelondlc-db** на Render:
- Откройте вкладку **Info** или **Connections**
- Скопируйте **Internal Database URL**

Она выглядит так:
```
postgresql://user:pass@dpg-xxxxx-a.oregon-postgres.render.com/nelondlc_db
```

### 2. Добавьте в Environment на Render

В настройках вашего Web Service добавьте переменную:

```
DATABASE_URL = postgresql://user:pass@dpg-xxxxx-a.oregon-postgres.render.com/nelondlc_db
```

### 3. Готово!

После сохранения Render автоматически перезапустит приложение с PostgreSQL.

## Что изменилось

✅ Приложение теперь автоматически определяет тип базы данных:
- Если есть `DATABASE_URL` → использует PostgreSQL
- Если нет → использует SQLite (для локальной разработки)

✅ Все таблицы создаются автоматически при первом запуске

✅ Создается админ по умолчанию:
- Логин: `admin`
- Пароль: `admin`

## Проверка

В логах Render должно появиться:
```
✅ Using PostgreSQL database
✅ PostgreSQL tables initialized
✅ Admin user created: admin / admin
```

## Локальная разработка

Для локальной работы просто не добавляйте `DATABASE_URL` в `.env` - будет использоваться SQLite.
