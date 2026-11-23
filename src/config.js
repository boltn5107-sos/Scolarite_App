const path = require('node:path');
const crypto = require('node:crypto');

require('dotenv').config();

const sessionSecret = process.env.SESSION_SECRET ||
  (process.env.NODE_ENV === 'production' ? null : crypto.randomBytes(32).toString('hex'));

if (!sessionSecret) {
  throw new Error('SESSION_SECRET doit etre defini dans les variables d environnement');
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  env: process.env.NODE_ENV || 'development',
  version: process.env.APP_VERSION || '1.0.0',
  vmName: process.env.VM_NAME || require('node:os').hostname(),
  year: process.env.SCOLARITE_YEAR || '2025-2026',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'scolarite',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'scolarite'
  },
  sessionSecret,
  sessionMaxAge: Number(process.env.SESSION_MAX_AGE) || 3600000,
  uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
  maxUploadSize: Number(process.env.MAX_UPLOAD_SIZE) || 5 * 1024 * 1024,
  seedPassword: process.env.SEED_PASSWORD || 'Test1234!'
};
