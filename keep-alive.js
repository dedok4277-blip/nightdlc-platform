import https from 'https';
import http from 'http';

// URL вашего сервера (замените на свой)
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5173';

// Интервал пинга в миллисекундах (14 минут)
const PING_INTERVAL = 14 * 60 * 1000;

function pingServer() {
  const url = new URL(SERVER_URL);
  const protocol = url.protocol === 'https:' ? https : http;
  
  const startTime = Date.now();
  
  protocol.get(SERVER_URL, (res) => {
    const duration = Date.now() - startTime;
    console.log(`✅ Пинг успешен | Статус: ${res.statusCode} | Время: ${duration}ms | ${new Date().toLocaleString('ru-RU')}`);
  }).on('error', (err) => {
    console.error(`❌ Ошибка пинга: ${err.message} | ${new Date().toLocaleString('ru-RU')}`);
  });
}

console.log(`🚀 Бот запущен | Сервер: ${SERVER_URL}`);
console.log(`⏰ Интервал пинга: ${PING_INTERVAL / 1000 / 60} минут`);
console.log('─'.repeat(60));

// Первый пинг сразу при запуске
pingServer();

// Регулярные пинги
setInterval(pingServer, PING_INTERVAL);
