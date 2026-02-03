import https from 'https';
import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

// Конфигурация
const CONFIG = {
  serverUrl: process.env.SERVER_URL || 'http://localhost:5173',
  pingInterval: parseInt(process.env.PING_INTERVAL) || 14 * 60 * 1000, // 14 минут
  healthEndpoint: process.env.HEALTH_ENDPOINT || '/api/health',
  maxRetries: 3,
  retryDelay: 5000, // 5 секунд
};

let stats = {
  totalPings: 0,
  successfulPings: 0,
  failedPings: 0,
  startTime: Date.now(),
};

function formatUptime() {
  const uptime = Date.now() - stats.startTime;
  const hours = Math.floor(uptime / (1000 * 60 * 60));
  const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}ч ${minutes}м`;
}

function pingServer(retryCount = 0) {
  const url = new URL(CONFIG.serverUrl + CONFIG.healthEndpoint);
  const protocol = url.protocol === 'https:' ? https : http;
  
  const startTime = Date.now();
  stats.totalPings++;
  
  const request = protocol.get(url.toString(), (res) => {
    const duration = Date.now() - startTime;
    
    if (res.statusCode === 200) {
      stats.successfulPings++;
      console.log(`✅ Пинг #${stats.totalPings} | ${res.statusCode} | ${duration}ms | Успешно: ${stats.successfulPings}/${stats.totalPings} | Аптайм: ${formatUptime()}`);
    } else {
      stats.failedPings++;
      console.log(`⚠️  Пинг #${stats.totalPings} | ${res.statusCode} | ${duration}ms | Неожиданный статус`);
    }
  });

  request.on('error', (err) => {
    stats.failedPings++;
    console.error(`❌ Пинг #${stats.totalPings} | Ошибка: ${err.message}`);
    
    if (retryCount < CONFIG.maxRetries) {
      console.log(`🔄 Повтор через ${CONFIG.retryDelay / 1000}с... (попытка ${retryCount + 1}/${CONFIG.maxRetries})`);
      setTimeout(() => pingServer(retryCount + 1), CONFIG.retryDelay);
    }
  });

  request.setTimeout(30000, () => {
    request.destroy();
    console.error(`⏱️  Пинг #${stats.totalPings} | Таймаут (30с)`);
  });
}

function showStats() {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 СТАТИСТИКА');
  console.log('─'.repeat(60));
  console.log(`Всего пингов:     ${stats.totalPings}`);
  console.log(`Успешных:         ${stats.successfulPings} (${((stats.successfulPings / stats.totalPings) * 100).toFixed(1)}%)`);
  console.log(`Неудачных:        ${stats.failedPings}`);
  console.log(`Время работы:     ${formatUptime()}`);
  console.log('═'.repeat(60) + '\n');
}

// Показывать статистику каждый час
setInterval(showStats, 60 * 60 * 1000);

console.log('🚀 Keep-Alive бот запущен');
console.log('─'.repeat(60));
console.log(`🌐 Сервер:        ${CONFIG.serverUrl}`);
console.log(`🔗 Эндпоинт:      ${CONFIG.healthEndpoint}`);
console.log(`⏰ Интервал:      ${CONFIG.pingInterval / 1000 / 60} минут`);
console.log(`🔄 Макс. попыток: ${CONFIG.maxRetries}`);
console.log('─'.repeat(60));
console.log(`⏱️  Старт:         ${new Date().toLocaleString('ru-RU')}\n`);

// Первый пинг сразу
pingServer();

// Регулярные пинги
setInterval(() => pingServer(), CONFIG.pingInterval);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Остановка бота...');
  showStats();
  process.exit(0);
});
