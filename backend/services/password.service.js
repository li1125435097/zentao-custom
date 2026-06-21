'use strict';

const { randomInt } = require('node:crypto');

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*';
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

function pick(source) {
  return source[randomInt(source.length)];
}

function shuffle(items) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function generatePassword(length = 12) {
  const size = Math.max(length, 8);
  const chars = [
    pick(UPPER),
    pick(LOWER),
    pick(DIGITS),
    pick(SYMBOLS),
  ];

  for (let i = chars.length; i < size; i += 1) {
    chars.push(pick(ALL));
  }

  return shuffle(chars).join('');
}

module.exports = { generatePassword };
