'use strict';

const crypto = require('crypto');
const bcrypt = require('bcrypt');

function generate2FACode() {
  return crypto.randomInt(100000, 999999).toString();
}

async function hash2FACode(code) {
  return bcrypt.hash(code, 10);
}

async function verify2FACode(code, hash) {
  return bcrypt.compare(code, hash);
}

module.exports = { generate2FACode, hash2FACode, verify2FACode };
