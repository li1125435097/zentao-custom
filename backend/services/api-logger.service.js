'use strict';

const fs = require('node:fs');
const path = require('node:path');

const LOG_DIR = process.env.API_LOG_DIR || path.join(__dirname, '..', 'logs');
const LOG_FILE = process.env.API_LOG_FILE || path.join(LOG_DIR, 'api.log');
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'Token',
  'authorization',
  'Authorization',
]);

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function sanitize(value, depth = 0) {
  if (depth > 6 || value == null) return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, depth + 1));
  }

  if (typeof value !== 'object') {
    return value;
  }

  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key)) {
      result[key] = '***';
      continue;
    }
    result[key] = sanitize(item, depth + 1);
  }
  return result;
}

function writeLog(entry) {
  try {
    ensureLogDir();
    const line = `${JSON.stringify({
      ts: new Date().toISOString(),
      ...entry,
    })}\n`;
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch (error) {
    console.error('[api-logger] 写入日志失败:', error.message);
  }
}

function logApiRequest({ method, url, headers, body }) {
  writeLog({
    direction: 'request',
    method,
    url,
    headers: sanitize(headers),
    body: sanitize(body),
  });
}

function logApiResponse({ method, url, status, ok, data, error, durationMs }) {
  writeLog({
    direction: 'response',
    method,
    url,
    status,
    ok,
    durationMs,
    data: sanitize(data),
    error: sanitize(error),
  });
}

module.exports = {
  LOG_DIR,
  LOG_FILE,
  logApiRequest,
  logApiResponse,
  sanitize,
};
