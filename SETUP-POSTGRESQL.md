# Настройка PostgreSQL на Render

## Шаг 1: Получите строку подключения к базе данных

1. Откройте вашу базу данных **nelondlc-db** на Render
2. Найдите раздел **Connections** или **Info**
3. Скопируйте **Internal Database URL** (начинается с `postgresql://`)

Пример:
```
postgresql://nelondlc_user:password123@dpg-xxxxx.oregon-postgres.render.com/nelondlc_db
```

## Шаг 2: Настройте переменные окружения на Render

1. Откройте ваш Web Service на Render
2. Перейдите в **Environment**
3. Добавьте переменную окружения:

```
DATABASE_URL = postgresql://nelondlc_user:password123@dpg-xxxxx.oregon-postgres.render.com/nelondlc_db
```

4. Также добавьте другие необходимые переменные:

```
NODE_ENV = production
JWT_SECRET = ваш-секретный-ключ-для-jwt
PORT = 10000
```

## Шаг 3: Деплой приложения

После добавления переменных окружения Render автоматически перезапустит ваше приложение.

Приложение автоматически определит наличие `DATABASE_URL` и подключится к PostgreSQL вместо SQLite.

## Проверка подключения

После деплоя проверьте логи:
- Должно появиться сообщение: `✅ Using PostgreSQL database`
- Должно появиться: `✅ PostgreSQL tables initialized`

## Локальная разработка

Для локальной разработки просто не указывайте `DATABASE_URL` в `.env` файле - приложение автоматически будет использовать SQLite.

## Миграция данных (опционально)

Если у вас есть данные в SQLite, которые нужно перенести в PostgreSQL, используйте скрипт миграции (будет создан отдельно).
