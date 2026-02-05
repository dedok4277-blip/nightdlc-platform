# Настройка аватарок пользователей

## Проблема

Аватарки не отображаются в ClickGUI, потому что:
1. У пользователей не установлены аватарки в базе данных
2. URL аватарок могут быть относительными (нужны полные URL)

## Решение

### 1. Проверка текущих аватарок

```bash
node check-avatars.js
```

Этот скрипт покажет:
- Список пользователей
- Какие аватарки установлены
- Полные URL для API

### 2. Установка тестовой аватарки

```bash
node set-test-avatar.js
```

Этот скрипт установит placeholder аватарку для первого пользователя.

### 3. Установка своей аватарки

#### Вариант A: Через веб-интерфейс (рекомендуется)

1. Войдите на сайт: `https://nelondlc.onrender.com`
2. Перейдите в настройки профиля
3. Загрузите изображение (PNG, JPG, до 2MB)
4. Аватарка автоматически сохранится

#### Вариант B: Через внешний хостинг

1. Загрузите изображение на [imgur.com](https://imgur.com)
2. Скопируйте прямую ссылку (должна заканчиваться на .png или .jpg)
3. Обновите базу данных:

```sql
UPDATE users 
SET avatar_url = 'https://i.imgur.com/ваш-файл.png' 
WHERE uid = 'ваш-uid';
```

#### Вариант C: Через локальную загрузку

1. Поместите изображение в папку `uploads/`
2. Обновите базу данных:

```sql
UPDATE users 
SET avatar_url = '/uploads/имя-файла.png' 
WHERE uid = 'ваш-uid';
```

## Что было исправлено

### Серверная часть

**Файл:** `server/index.js`

Эндпоинт `/api/user/:uid` теперь возвращает полный URL:

```javascript
// Формируем полный URL для аватарки
let avatarUrl = null
if (user.avatar_url) {
  if (user.avatar_url.startsWith('/')) {
    avatarUrl = `https://nelondlc.onrender.com${user.avatar_url}`
  } else if (user.avatar_url.startsWith('http://') || user.avatar_url.startsWith('https://')) {
    avatarUrl = user.avatar_url
  } else {
    avatarUrl = `https://nelondlc.onrender.com/${user.avatar_url}`
  }
}
```

### Клиентская часть

**Файл:** `WebsiteAPI.java`

Добавлено логирование для отладки:
- Логи загрузки данных пользователя
- Логи загрузки аватарки
- Информация об ошибках

## Тестирование

### 1. Проверка API

```bash
# Замените {uid} на реальный UID пользователя
curl https://nelondlc.onrender.com/api/user/{uid}
```

Ожидаемый ответ:
```json
{
  "username": "Wh1teW1ndows_",
  "uid": "12345",
  "isAdmin": true,
  "avatarUrl": "https://nelondlc.onrender.com/uploads/avatar.png"
}
```

### 2. Проверка в клиенте

1. Запустите Minecraft клиент
2. Откройте консоль (логи)
3. Найдите строки с `[WebsiteAPI]`:
   ```
   [WebsiteAPI] Loading user data for UID: 12345
   [WebsiteAPI] Response code: 200
   [WebsiteAPI] Response: {"username":"...","avatarUrl":"..."}
   [WebsiteAPI] Username from API: Wh1teW1ndows_
   [WebsiteAPI] Avatar URL: https://...
   [WebsiteAPI] Loading avatar from: https://...
   [WebsiteAPI] Avatar image loaded: 128x128
   [WebsiteAPI] Avatar texture created: nightdlc:avatar_...
   ```

4. Откройте ClickGUI (RightShift)
5. Проверьте левый нижний угол

## Требования к аватаркам

- **Формат:** PNG, JPG, GIF
- **Размер файла:** до 2MB (для загрузки через сайт)
- **Рекомендуемое разрешение:** 128x128 или 256x256 пикселей
- **Форма:** квадратная (автоматически округляется в GUI)

## Рекомендуемые хостинги для аватарок

1. **Imgur** - https://imgur.com
   - Бесплатно
   - Прямые ссылки
   - Надежно

2. **Discord CDN** - загрузите в Discord, скопируйте ссылку
   - Бесплатно
   - Быстро
   - Надежно

3. **GitHub** - загрузите в репозиторий
   - Бесплатно
   - Версионирование
   - Надежно

## Примеры URL

### Правильные URL:
```
✅ https://i.imgur.com/abc123.png
✅ https://cdn.discordapp.com/attachments/.../avatar.png
✅ https://nelondlc.onrender.com/uploads/avatar.png
✅ /uploads/avatar.png (будет преобразован в полный URL)
```

### Неправильные URL:
```
❌ imgur.com/abc123 (без протокола и расширения)
❌ C:\Users\...\avatar.png (локальный путь)
❌ avatar.png (относительный путь без слеша)
```

## Отладка

### Если аватарка не загружается:

1. **Проверьте консоль клиента:**
   - Есть ли ошибки `[WebsiteAPI]`?
   - Какой URL аватарки получен?
   - Загрузилось ли изображение?

2. **Проверьте URL в браузере:**
   - Откройте URL аватарки в браузере
   - Должно открыться изображение

3. **Проверьте базу данных:**
   ```sql
   SELECT uid, username, avatar_url FROM users WHERE uid = 'ваш-uid';
   ```

4. **Проверьте API:**
   ```bash
   curl https://nelondlc.onrender.com/api/user/ваш-uid
   ```

### Если никнейм не отображается:

1. Проверьте, что пользователь зарегистрирован
2. Проверьте логи клиента
3. Убедитесь, что сервер запущен

## Скрипты

| Скрипт | Описание |
|--------|----------|
| `check-avatars.js` | Проверка аватарок всех пользователей |
| `set-test-avatar.js` | Установка тестовой аватарки |
| `test-user-api.js` | Тест API эндпоинта |

## Готово!

После выполнения этих шагов:
- ✅ Аватарки будут отображаться в ClickGUI
- ✅ Никнеймы будут загружаться с сайта
- ✅ Данные будут обновляться автоматически

---

**Дата:** 2026-02-05  
**Версия:** 1.1
