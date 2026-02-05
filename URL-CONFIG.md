# Конфигурация URL сервера

## Рабочий URL сервера

**Основной URL:** `https://nelondlc.onrender.com`

## API Эндпоинты

### Профиль пользователя
```
GET https://nelondlc.onrender.com/api/user/{uid}
```

### Здоровье сервера
```
GET https://nelondlc.onrender.com/api/health
```

### Пинг
```
GET https://nelondlc.onrender.com/api/ping
```

## Локальная разработка

При локальной разработке используйте:
```
http://localhost:5173
```

## Конфигурация в клиенте

**Файл:** `NightDLC/src/java/dev/wh1tew1ndows/client/api/WebsiteAPI.java`

```java
private static final String API_URL = "https://nelondlc.onrender.com/api/user/";
```

## Тестирование

### Проверка API в браузере
```
https://nelondlc.onrender.com/api/user/{uid}
```

### Проверка через curl
```bash
curl https://nelondlc.onrender.com/api/user/{uid}
```

### Проверка здоровья
```bash
curl https://nelondlc.onrender.com/api/health
```

## Важно

- ✅ Используйте HTTPS (не HTTP)
- ✅ URL: `nelondlc.onrender.com` (не `nightdlc.site`)
- ✅ Сервер работает 24/7 на Render
- ✅ База данных: PostgreSQL на Render

## Обновлено

Все файлы обновлены с правильным URL:
- ✅ `WebsiteAPI.java` - клиент
- ✅ `API_DOCUMENTATION.md` - документация API
- ✅ `USER-PROFILE-INTEGRATION.md` - интеграция
- ✅ `ПРОФИЛЬ-В-CLICKGUI.md` - инструкция
- ✅ `SUMMARY-PROFILE-FEATURE.md` - сводка

---

**Дата обновления:** 2026-02-05
