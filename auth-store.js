'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {promisify} = require('node:util');
const {DatabaseSync} = require('node:sqlite');

const scrypt = promisify(crypto.scrypt);
const HASH_BYTES = 64;
const SCRYPT_OPTIONS = {N:32768,r:8,p:1,maxmem:64 * 1024 * 1024};
const USERNAME_PATTERN = /^[\p{L}\p{N}._-]{3,32}$/u;
const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_MAX_LENGTH = 256;
const USER_DATA_MAX_BYTES = 512 * 1024;

function normalizeUsername(username) {
  return username.normalize('NFC').toLocaleLowerCase('en-US');
}

function validateUsername(username) {
  if (typeof username !== 'string') throw Object.assign(new Error('请输入用户名。'), {status:400});
  const value = username.trim().normalize('NFC');
  if (!USERNAME_PATTERN.test(value)) throw Object.assign(new Error('用户名需为 3 至 32 位字母、数字或 . _ -。'), {status:400});
  return value;
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    throw Object.assign(new Error(`密码长度需为 ${PASSWORD_MIN_LENGTH} 至 ${PASSWORD_MAX_LENGTH} 个字符。`), {status:400});
  }
  return password;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(password, salt, HASH_BYTES, SCRYPT_OPTIONS);
  return `scrypt$${SCRYPT_OPTIONS.N}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

const dummyPasswordHashPromise = hashPassword('not-a-real-sanxingdui-account-password');

async function verifyPassword(password, encoded) {
  try {
    const encodedValue = typeof encoded === 'string' ? encoded : await dummyPasswordHashPromise;
    const [algorithm, n, r, p, saltText, hashText] = encodedValue.split('$');
    if (algorithm !== 'scrypt' || Number(n) !== SCRYPT_OPTIONS.N || Number(r) !== SCRYPT_OPTIONS.r || Number(p) !== SCRYPT_OPTIONS.p) return false;
    const expected = Buffer.from(hashText, 'base64url');
    if (expected.length !== HASH_BYTES) return false;
    const actual = await scrypt(password, Buffer.from(saltText, 'base64url'), HASH_BYTES, SCRYPT_OPTIONS);
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function createAuthStore(databasePath) {
  const resolvedPath = path.resolve(databasePath);
  fs.mkdirSync(path.dirname(resolvedPath), {recursive:true});
  const db = new DatabaseSync(resolvedPath);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL,
      username_normalized TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
      disabled INTEGER NOT NULL DEFAULT 0 CHECK (disabled IN (0,1)),
      created_at TEXT NOT NULL,
      last_login_at TEXT
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS user_data (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      collection TEXT NOT NULL,
      item_key TEXT NOT NULL,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, collection, item_key)
    );
    CREATE INDEX IF NOT EXISTS user_data_updated_at_idx ON user_data(user_id, updated_at);
    CREATE TABLE IF NOT EXISTS user_artworks (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      metadata_json TEXT NOT NULL,
      mime_type TEXT NOT NULL CHECK (mime_type IN ('image/png','image/jpeg','image/webp')),
      size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS user_artworks_user_created_idx ON user_artworks(user_id, created_at DESC);
  `);

  const userCountQuery = db.prepare('SELECT COUNT(*) AS count FROM users');
  const findUserByName = db.prepare('SELECT id, username, username_normalized, password_hash, role, disabled, created_at, last_login_at FROM users WHERE username_normalized = ?');
  const insertUser = db.prepare('INSERT INTO users (username, username_normalized, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)');
  const insertSession = db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)');
  const findSession = db.prepare(`SELECT users.id, users.username, users.role, users.created_at
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND users.disabled = 0`);
  const deleteSession = db.prepare('DELETE FROM sessions WHERE token_hash = ?');
  const deleteOtherSessions = db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?');
  const updateLastLogin = db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?');
  const updatePasswordHash = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
  const deleteUser = db.prepare('DELETE FROM users WHERE id = ?');
  const cleanSessions = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');
  const getUserData = db.prepare('SELECT data_json, updated_at FROM user_data WHERE user_id = ? AND collection = ? AND item_key = ?');
  const listUserData = db.prepare('SELECT collection, item_key, data_json, updated_at FROM user_data WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?');
  const saveUserData = db.prepare(`INSERT INTO user_data (user_id, collection, item_key, data_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, collection, item_key) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`);
  const deleteUserData = db.prepare('DELETE FROM user_data WHERE user_id = ? AND collection = ? AND item_key = ?');
  const userDataStats = db.prepare('SELECT COUNT(*) AS item_count, COALESCE(SUM(length(CAST(data_json AS BLOB))), 0) AS data_bytes FROM user_data WHERE user_id = ?');
  const insertArtwork = db.prepare('INSERT INTO user_artworks (id, user_id, metadata_json, mime_type, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  const listArtworks = db.prepare('SELECT id, metadata_json, mime_type, size_bytes, created_at FROM user_artworks WHERE user_id = ? ORDER BY created_at DESC LIMIT 500');
  const getArtwork = db.prepare('SELECT id, user_id, metadata_json, mime_type, size_bytes, created_at FROM user_artworks WHERE id = ? AND user_id = ?');
  const deleteArtwork = db.prepare('DELETE FROM user_artworks WHERE id = ? AND user_id = ?');
  const artworkStats = db.prepare('SELECT COUNT(*) AS item_count, COALESCE(SUM(size_bytes), 0) AS data_bytes FROM user_artworks WHERE user_id = ?');

  function publicUser(row) {
    if (!row) return null;
    return {id:row.id, username:row.username, role:row.role, createdAt:row.created_at};
  }

  async function createUser(usernameInput, passwordInput, role = 'member') {
    const username = validateUsername(usernameInput);
    const password = validatePassword(passwordInput);
    const passwordHash = await hashPassword(password);
    const createdAt = new Date().toISOString();
    insertUser.run(username, normalizeUsername(username), passwordHash, role, createdAt);
    return publicUser(findUserByName.get(normalizeUsername(username)));
  }

  async function initializeInitialUser(username, password) {
    if (Number(userCountQuery.get().count) > 0) return {created:false, userCount:Number(userCountQuery.get().count)};
    if (!username || !password) return {created:false, userCount:0};
    try {
      const user = await createUser(username, password, 'admin');
      return {created:true, userCount:1, username:user.username};
    } catch (error) {
      if (error.code === 'ERR_SQLITE_ERROR' && /UNIQUE constraint failed/.test(error.message)) return {created:false, userCount:Number(userCountQuery.get().count)};
      throw error;
    }
  }

  return {
    databasePath:resolvedPath,
    userCount:() => Number(userCountQuery.get().count),
    initializeInitialUser,
    findUser:username => findUserByName.get(normalizeUsername(username)),
    createUser,
    publicUser,
    verifyPassword,
    createSession:(tokenHash, userId, expiresAt) => insertSession.run(tokenHash, userId, new Date().toISOString(), expiresAt),
    findSession:(tokenHash, now = Date.now()) => publicUser(findSession.get(tokenHash, now)),
    deleteSession:tokenHash => deleteSession.run(tokenHash),
    setLastLogin:userId => updateLastLogin.run(new Date().toISOString(), userId),
    hashPassword,
    updatePassword:(userId, passwordHash, currentTokenHash) => {
      db.exec('BEGIN IMMEDIATE');
      try {
        updatePasswordHash.run(passwordHash, userId);
        deleteOtherSessions.run(userId, currentTokenHash);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    deleteUser:userId => {
      db.exec('BEGIN IMMEDIATE');
      try {
        const result = deleteUser.run(userId);
        db.exec('COMMIT');
        return result.changes > 0;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    cleanExpiredSessions:(now = Date.now()) => cleanSessions.run(now),
    listUserData:(userId, limit = 100, offset = 0) => listUserData.all(userId, limit, offset).map(row => ({collection:row.collection, key:row.item_key, value:JSON.parse(row.data_json), updatedAt:row.updated_at})),
    getUserData:(userId, collection, key) => {
      const row = getUserData.get(userId, collection, key);
      return row ? {value:JSON.parse(row.data_json), updatedAt:row.updated_at} : null;
    },
    saveUserData:(userId, collection, key, value) => {
      const dataJson = JSON.stringify(value);
      if (Buffer.byteLength(dataJson, 'utf8') > USER_DATA_MAX_BYTES) throw Object.assign(new Error('单条个人数据不能超过 512 KB。'), {status:413});
      const now = new Date().toISOString();
      saveUserData.run(userId, collection, key, dataJson, now, now);
      return {value, updatedAt:now};
    },
    deleteUserData:(userId, collection, key) => deleteUserData.run(userId, collection, key),
    getUserDataStats:userId => {
      const row = userDataStats.get(userId);
      return {itemCount:Number(row.item_count), dataBytes:Number(row.data_bytes)};
    },
    createArtwork:(userId, id, metadata, mimeType, sizeBytes) => {
      const createdAt = new Date().toISOString();
      insertArtwork.run(id, userId, JSON.stringify(metadata), mimeType, sizeBytes, createdAt);
      return {id, ...metadata, mimeType, sizeBytes, createdAt};
    },
    listArtworks:userId => listArtworks.all(userId).map(row => ({id:row.id, ...JSON.parse(row.metadata_json), mimeType:row.mime_type, sizeBytes:Number(row.size_bytes), createdAt:row.created_at})),
    getArtwork:(userId, id) => {
      const row = getArtwork.get(id, userId);
      return row ? {id:row.id, userId:Number(row.user_id), ...JSON.parse(row.metadata_json), mimeType:row.mime_type, sizeBytes:Number(row.size_bytes), createdAt:row.created_at} : null;
    },
    deleteArtwork:(userId, id) => deleteArtwork.run(id, userId).changes > 0,
    getArtworkStats:userId => {
      const row = artworkStats.get(userId);
      return {fileCount:Number(row.item_count), fileBytes:Number(row.data_bytes)};
    },
    close:() => db.close()
  };
}

module.exports = {createAuthStore, validateUsername, validatePassword};
