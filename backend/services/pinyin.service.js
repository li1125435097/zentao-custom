'use strict';

const { randomBytes } = require('node:crypto');
const { pinyin } = require('pinyin-pro');

function charToPinyin(char) {
  const value = String(char || '').trim();
  if (!value) return null;

  const result = pinyin(value, {
    toneType: 'none',
    type: 'array',
    surname: 'head',
    nonZh: 'consecutive',
  });

  return result[0] || null;
}

function nameToAccount(realname) {
  const name = String(realname || '').trim();
  if (!name) {
    return `user${randomBytes(3).toString('hex')}`;
  }

  const syllables = pinyin(name, {
    toneType: 'none',
    type: 'array',
    surname: 'head',
    nonZh: 'consecutive',
  });

  const account = syllables
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  if (!account) {
    return `user${randomBytes(3).toString('hex')}`;
  }

  return account;
}

module.exports = { nameToAccount, charToPinyin };
