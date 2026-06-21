'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const ENV_PATH = path.join(ROOT_DIR, '.env');

function loadEnvFile() {
  if (!fs.existsSync(ENV_PATH)) return;

  const content = fs.readFileSync(ENV_PATH, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

module.exports = {
  ROOT_DIR,
  PORT: Number(process.env.PORT || 3000),
  HOST: process.env.HOST || '0.0.0.0',
  FRONTEND_DIR: path.join(ROOT_DIR, 'frontend'),
  ZENTAO_BASE_URL: process.env.ZENTAO_BASE_URL || 'https://mdsteam.medisyn.cc:1857',
  ZENTAO_DEFAULT_DEPT_ID: Number(process.env.ZENTAO_DEFAULT_DEPT_ID || 1),
  ZENTAO_DEFAULT_DEPT_NAME: process.env.ZENTAO_DEFAULT_DEPT_NAME || '应用开发部',
  MANAGER_TOKEN: process.env.MANAGER_TOKEN || '',
};
