const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('./config');

const ALLOWED_TYPES = new Map([
  ['application/pdf', '.pdf'],
  ['image/jpeg', '.jpg']
]);

function extensionFor(mimetype) {
  return ALLOWED_TYPES.get(mimetype) || null;
}

async function save(file) {
  const extension = extensionFor(file.mimetype);
  if (!extension) throw new Error('Type de fichier non autorise');
  if (file.size > config.maxUploadSize) throw new Error('Fichier trop volumineux');

  await fs.mkdir(config.uploadDir, { recursive: true });
  const key = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  await fs.writeFile(path.join(config.uploadDir, key), file.buffer);
  return key;
}

function getPath(key) {
  return path.join(config.uploadDir, path.basename(key));
}

module.exports = { save, getPath, extensionFor, ALLOWED_TYPES };
