# Инструкция по деплою на Timeweb

## 1. Подготовка проекта

### Локально выполните:
```bash
npm run build
```

Это создаст папку `dist` с собранным фронтендом.

## 2. Загрузка файлов на сервер

### Через FTP/SFTP загрузите на сервер:
- Все файлы проекта (кроме `node_modules`)
- Файл `.gitignore` можно не загружать

### Структура на сервере должна быть:
```
/home/c/cz505339/cz505339.tw1.ru/
├── server/
├── src/
├── dist/           (после npm run build)
├── uploads/
├── package.json
├── ecosystem.config.js
├── nightdlc.db
└── другие файлы...
```

## 3. Подключение по SSH и установка зависимостей

```bash
# Подключитесь по SSH к серверу
ssh cz505339@cz505339.tw1.ru

# Перейдите в директорию сайта
cd ~/cz505339.tw1.ru/public_html

# Установите зависимости
npm install --production

# Соберите фронтенд (если не собрали локально)
npm run build
```

## 4. Настройка PM2 для автозапуска

```bash
# Установите PM2 глобально (если еще не установлен)
npm install -g pm2

# Запустите приложение через PM2
pm2 start ecosystem.config.js

# Сохраните конфигурацию PM2
pm2 save

# Настройте автозапуск при перезагрузке сервера
pm2 startup
```

## 5. Настройка Nginx (если требуется)

Если на Timeweb используется Nginx, создайте конфигурацию:

```nginx
server {
    listen 80;
    server_name cz505339.tw1.ru;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 6. Проверка работы

```bash
# Проверьте статус приложения
pm2 status

# Посмотрите логи
pm2 logs nelondlc

# Перезапустите при необходимости
pm2 restart nelondlc
```

## 7. Обновление приложения

```bash
# Остановите приложение
pm2 stop nelondlc

# Обновите код (через git pull или загрузите новые файлы)
# Установите новые зависимости
npm install --production

# Пересоберите фронтенд
npm run build

# Запустите приложение
pm2 restart nelondlc
```

## Полезные команды PM2

```bash
pm2 list              # Список всех процессов
pm2 logs nelondlc     # Логи приложения
pm2 restart nelondlc  # Перезапуск
pm2 stop nelondlc     # Остановка
pm2 delete nelondlc   # Удаление из PM2
pm2 monit             # Мониторинг в реальном времени
```

## Переменные окружения

Убедитесь, что в `ecosystem.config.js` установлены правильные переменные:
- `NODE_ENV=production`
- `PORT=5173` (или другой порт, который настроен в панели Timeweb)

## Привязка домена

1. В панели Timeweb перейдите в раздел "Сайты"
2. Нажмите "Перенести сайт" или "Привязать домен"
3. Укажите ваш домен (если есть)
4. Настройте DNS записи у регистратора домена на IP сервера Timeweb

## Troubleshooting

### Приложение не запускается
```bash
# Проверьте логи
pm2 logs nelondlc --lines 100

# Проверьте, занят ли порт
netstat -tulpn | grep 5173
```

### База данных не работает
```bash
# Проверьте права на файл БД
chmod 644 nightdlc.db
chmod 755 .
```

### Статические файлы не отдаются
- Убедитесь, что папка `dist` существует и содержит файлы
- Проверьте, что `NODE_ENV=production` установлена в ecosystem.config.js
