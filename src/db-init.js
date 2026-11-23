const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');
const config = require('./config');

async function init() {
  const bootstrap = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true
  });

  try {
    await bootstrap.query(
      'CREATE DATABASE IF NOT EXISTS ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
      [config.db.name]
    );
  } finally {
    await bootstrap.end();
  }

  const schema = await fs.readFile(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  const { name, ...connectionConfig } = config.db;
  const connection = await mysql.createConnection({ ...connectionConfig, database: name, multipleStatements: true });
  try {
    await connection.query(schema);
  } finally {
    await connection.end();
  }

  process.stdout.write(`Base ${config.db.name} initialisee.\n`);
}

init().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
