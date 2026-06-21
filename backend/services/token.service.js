'use strict';

const crypto = require('node:crypto');
const { readCollection, writeCollection } = require('./json-db.service');
const { nameToAccount } = require('./pinyin.service');

const COLLECTION = 'tokens';
const RANDOM_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function listTokens() {
  return readCollection(COLLECTION, []);
}

function saveTokens(tokens) {
  writeCollection(COLLECTION, tokens);
}

function generateRandomAlphanumeric(length) {
  let result = '';
  for (let i = 0; i < length; i += 1) {
    const index = crypto.randomInt(RANDOM_CHARS.length);
    result += RANDOM_CHARS[index];
  }
  return result;
}

function generateTokenValue(realname) {
  const prefix = nameToAccount(realname);
  const suffix = generateRandomAlphanumeric(20);
  return `${prefix}_${suffix}`;
}

function addToken({ realname }) {
  const name = String(realname || '').trim();
  if (!name) {
    return { ok: false, error: '请填写姓名', status: 400 };
  }

  const tokens = listTokens();
  let tokenValue = generateTokenValue(name);
  let attempts = 0;

  while (tokens.some((item) => item.token === tokenValue) && attempts < 10) {
    tokenValue = generateTokenValue(name);
    attempts += 1;
  }

  if (tokens.some((item) => item.token === tokenValue)) {
    return { ok: false, error: '生成 Token 失败，请重试', status: 500 };
  }

  const entry = {
    id: crypto.randomUUID(),
    realname: name,
    token: tokenValue,
    status: 'enabled',
    createdAt: new Date().toISOString(),
  };

  tokens.push(entry);
  saveTokens(tokens);
  return { ok: true, data: entry };
}

function updateTokenStatus(id, status) {
  const normalizedStatus = status === 'disabled' ? 'disabled' : 'enabled';
  const tokens = listTokens();
  const index = tokens.findIndex((item) => item.id === id);
  if (index === -1) {
    return { ok: false, error: 'Token 不存在', status: 404 };
  }

  tokens[index] = { ...tokens[index], status: normalizedStatus };
  saveTokens(tokens);
  return { ok: true, data: tokens[index] };
}

module.exports = {
  listTokens,
  addToken,
  updateTokenStatus,
};
