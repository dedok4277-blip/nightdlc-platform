import rateLimit from 'express-rate-limit'
import slowDown from 'express-slow-down'

// Хранилище для отслеживания подозрительных IP
const suspiciousIPs = new Map()
const blockedIPs = new Set()
const requestCounts = new Map()

// Настройки защиты
const DDOS_CONFIG = {
  // Максимум запросов за окно времени
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 минута
  
  // Порог для блокировки
  suspiciousThreshold: 200, // запросов за минуту
  blockThreshold: 500, // запросов за минуту
  
  // Время блокировки
  blockDuration: 15 * 60 * 1000, // 15 минут
  
  // Whitelist IP (не блокируются)
  whitelist: ['127.0.0.1', '::1', 'localhost'],
}

// Получение IP адреса клиента
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         req.ip
}

// Проверка, находится ли IP в whitelist
function isWhitelisted(ip) {
  return DDOS_CONFIG.whitelist.includes(ip)
}

// Middleware для блокировки IP
export function blockIPMiddleware(req, res, next) {
  const ip = getClientIP(req)
  
  // Пропускаем whitelisted IP
  if (isWhitelisted(ip)) {
    return next()
  }
  
  // Проверяем, заблокирован ли IP
  if (blockedIPs.has(ip)) {
    const blockInfo = suspiciousIPs.get(ip)
    const timeLeft = blockInfo ? Math.ceil((blockInfo.blockedUntil - Date.now()) / 1000) : 0
    
    console.log(`🚫 Blocked request from ${ip} (${timeLeft}s remaining)`)
    
    return res.status(429).json({
      error: 'too_many_requests',
      message: 'Your IP has been temporarily blocked due to suspicious activity',
      blockedFor: timeLeft,
      retryAfter: timeLeft
    })
  }
  
  next()
}

// Middleware для отслеживания запросов
export function trackRequestsMiddleware(req, res, next) {
  const ip = getClientIP(req)
  
  // Пропускаем whitelisted IP
  if (isWhitelisted(ip)) {
    return next()
  }
  
  const now = Date.now()
  
  // Получаем или создаем счетчик для IP
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, {
      count: 0,
      firstRequest: now,
      lastRequest: now,
      requests: []
    })
  }
  
  const ipData = requestCounts.get(ip)
  
  // Очищаем старые запросы (старше 1 минуты)
  ipData.requests = ipData.requests.filter(time => now - time < DDOS_CONFIG.windowMs)
  
  // Добавляем текущий запрос
  ipData.requests.push(now)
  ipData.count = ipData.requests.length
  ipData.lastRequest = now
  
  // Проверяем на превышение лимитов
  if (ipData.count > DDOS_CONFIG.blockThreshold) {
    // Блокируем IP
    blockedIPs.add(ip)
    suspiciousIPs.set(ip, {
      blockedAt: now,
      blockedUntil: now + DDOS_CONFIG.blockDuration,
      requestCount: ipData.count,
      reason: 'DDoS attack detected'
    })
    
    console.log(`🚨 BLOCKED IP ${ip} - ${ipData.count} requests in 1 minute`)
    
    // Устанавливаем таймер для разблокировки
    setTimeout(() => {
      blockedIPs.delete(ip)
      suspiciousIPs.delete(ip)
      requestCounts.delete(ip)
      console.log(`✅ Unblocked IP ${ip}`)
    }, DDOS_CONFIG.blockDuration)
    
    return res.status(429).json({
      error: 'too_many_requests',
      message: 'Your IP has been blocked due to DDoS attack detection',
      blockedFor: Math.ceil(DDOS_CONFIG.blockDuration / 1000),
      requestCount: ipData.count
    })
  } else if (ipData.count > DDOS_CONFIG.suspiciousThreshold) {
    // Помечаем как подозрительный
    if (!suspiciousIPs.has(ip)) {
      suspiciousIPs.set(ip, {
        markedAt: now,
        requestCount: ipData.count,
        reason: 'High request rate'
      })
      console.log(`⚠️  Suspicious activity from ${ip} - ${ipData.count} requests in 1 minute`)
    }
  }
  
  next()
}

// Rate limiter для общих запросов
export const generalLimiter = rateLimit({
  windowMs: DDOS_CONFIG.windowMs,
  max: DDOS_CONFIG.maxRequests,
  message: {
    error: 'too_many_requests',
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isWhitelisted(getClientIP(req)),
  keyGenerator: (req) => getClientIP(req)
})

// Rate limiter для API запросов (более строгий)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 50, // 50 запросов
  message: {
    error: 'too_many_requests',
    message: 'Too many API requests, please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isWhitelisted(getClientIP(req)),
  keyGenerator: (req) => getClientIP(req)
})

// Rate limiter для авторизации (очень строгий)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5, // 5 попыток
  message: {
    error: 'too_many_requests',
    message: 'Too many login attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => getClientIP(req)
})

// Slow down для постепенного замедления
export const speedLimiter = slowDown({
  windowMs: 60 * 1000, // 1 минута
  delayAfter: 50, // После 50 запросов начинаем замедлять
  delayMs: (hits) => hits * 100, // Увеличиваем задержку на 100мс за каждый запрос
  maxDelayMs: 5000, // Максимальная задержка 5 секунд
  skip: (req) => isWhitelisted(getClientIP(req)),
  keyGenerator: (req) => getClientIP(req)
})

// Middleware для логирования подозрительной активности
export function logSuspiciousActivity(req, res, next) {
  const ip = getClientIP(req)
  
  if (suspiciousIPs.has(ip) && !isWhitelisted(ip)) {
    const info = suspiciousIPs.get(ip)
    console.log(`⚠️  Suspicious request from ${ip}:`, {
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
      requestCount: info.requestCount,
      reason: info.reason
    })
  }
  
  next()
}

// Функция для получения статистики
export function getAntiDDoSStats() {
  return {
    blockedIPs: Array.from(blockedIPs),
    suspiciousIPs: Array.from(suspiciousIPs.entries()).map(([ip, info]) => ({
      ip,
      ...info
    })),
    activeConnections: requestCounts.size,
    totalBlocked: blockedIPs.size,
    totalSuspicious: suspiciousIPs.size
  }
}

// Функция для ручной блокировки IP
export function blockIP(ip, duration = DDOS_CONFIG.blockDuration, reason = 'Manual block') {
  if (isWhitelisted(ip)) {
    return { success: false, message: 'Cannot block whitelisted IP' }
  }
  
  const now = Date.now()
  blockedIPs.add(ip)
  suspiciousIPs.set(ip, {
    blockedAt: now,
    blockedUntil: now + duration,
    reason
  })
  
  console.log(`🚫 Manually blocked IP ${ip} for ${duration / 1000}s - ${reason}`)
  
  setTimeout(() => {
    blockedIPs.delete(ip)
    suspiciousIPs.delete(ip)
    requestCounts.delete(ip)
    console.log(`✅ Unblocked IP ${ip}`)
  }, duration)
  
  return { success: true, message: `IP ${ip} blocked for ${duration / 1000}s` }
}

// Функция для разблокировки IP
export function unblockIP(ip) {
  if (blockedIPs.has(ip)) {
    blockedIPs.delete(ip)
    suspiciousIPs.delete(ip)
    requestCounts.delete(ip)
    console.log(`✅ Manually unblocked IP ${ip}`)
    return { success: true, message: `IP ${ip} unblocked` }
  }
  
  return { success: false, message: `IP ${ip} is not blocked` }
}

// Функция для добавления IP в whitelist
export function addToWhitelist(ip) {
  if (!DDOS_CONFIG.whitelist.includes(ip)) {
    DDOS_CONFIG.whitelist.push(ip)
    // Разблокируем если был заблокирован
    unblockIP(ip)
    console.log(`✅ Added ${ip} to whitelist`)
    return { success: true, message: `IP ${ip} added to whitelist` }
  }
  
  return { success: false, message: `IP ${ip} already in whitelist` }
}

// Очистка старых данных каждые 5 минут
setInterval(() => {
  const now = Date.now()
  
  // Очищаем счетчики запросов старше 5 минут
  for (const [ip, data] of requestCounts.entries()) {
    if (now - data.lastRequest > 5 * 60 * 1000) {
      requestCounts.delete(ip)
    }
  }
  
  console.log(`🧹 Cleaned up old request data. Active IPs: ${requestCounts.size}`)
}, 5 * 60 * 1000)

export default {
  blockIPMiddleware,
  trackRequestsMiddleware,
  generalLimiter,
  apiLimiter,
  authLimiter,
  speedLimiter,
  logSuspiciousActivity,
  getAntiDDoSStats,
  blockIP,
  unblockIP,
  addToWhitelist
}
