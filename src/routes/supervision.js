const os = require('node:os');
const express = require('express');
const config = require('../config');
const { ping } = require('../db');
const { asyncRoute } = require('../middleware');

const router = express.Router();

function platformInfo() {
  return {
    version: config.version,
    vmName: config.vmName,
    hostname: os.hostname(),
    node: process.version,
    environment: config.env
  };
}

router.get('/health', asyncRoute(async (req, res) => {
  try {
    await ping();
    res.status(200).json({ status: 'ok', database: 'ok', version: config.version, vm: config.vmName });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'ko', message: error.code || 'database unavailable' });
  }
}));

router.get('/version', asyncRoute(async (req, res) => {
  const info = platformInfo();
  const accept = req.get('Accept') || '';

  if (req.query.format === 'json') {
    return res.json(info);
  }

  if (accept.includes('text/html')) {
    let database = 'ok';
    try {
      await ping();
    } catch (error) {
      database = 'ko';
    }
    return res.render('supervision', {
      title: 'État de la plateforme',
      bodyClass: res.locals.user ? 'app' : 'public-page-body',
      info,
      port: config.port,
      database,
      checkedAt: new Date().toLocaleString('fr-FR')
    });
  }

  return res.json(info);
}));

module.exports = router;
