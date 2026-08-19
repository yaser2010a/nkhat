'use strict';

const MAX_ATTEMPTS = 3;
const LOCK_DURATION_MS = 60 * 60 * 1000;

const store = new Map();

function getKey(ip) {
  return ip || 'unknown';
}

function isBlocked(ip) {
  const entry = store.get(getKey(ip));
  if (!entry?.blockedUntil) return false;
  if (Date.now() >= entry.blockedUntil) {
    store.delete(getKey(ip));
    return false;
  }
  return true;
}

function getBlockRemaining(ip) {
  const entry = store.get(getKey(ip));
  if (!entry?.blockedUntil) return 0;
  return Math.max(0, entry.blockedUntil - Date.now());
}

function recordFailure(ip) {
  const key = getKey(ip);
  const entry = store.get(key) || { attempts: 0, blockedUntil: null };
  entry.attempts += 1;
  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.blockedUntil = Date.now() + LOCK_DURATION_MS;
    entry.attempts = 0;
  }
  store.set(key, entry);
}

function resetAttempts(ip) {
  store.delete(getKey(ip));
}

module.exports = { isBlocked, getBlockRemaining, recordFailure, resetAttempts, MAX_ATTEMPTS, LOCK_DURATION_MS };
