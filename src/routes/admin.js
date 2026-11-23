const express = require('express');
const { pool } = require('../db');
const { asyncRoute, setFlash } = require('../middleware');
const { hashPassword } = require('../security');

const router = express.Router();

router.get('/', (req, res) => res.redirect('/admin/statistiques'));

router.get('/agents', asyncRoute(async (req, res) => {
  const [agents] = await pool.query('SELECT id, username, nom, prenom, email, role, created_at FROM agents ORDER BY created_at DESC');
  res.render('admin/agents', { title: 'Comptes agents', agents, role: '' });
}));

router.post('/agents', asyncRoute(async (req, res) => {
  const values = {
    username: String(req.body.username || '').trim().toLowerCase(),
    nom: String(req.body.nom || '').trim(),
    prenom: String(req.body.prenom || '').trim(),
    email: String(req.body.email || '').trim().toLowerCase(),
    password: String(req.body.password || ''),
    role: req.body.role === 'admin' ? 'admin' : 'agent'
  };
  const errors = [];
  if (!/^[a-z0-9._-]{3,50}$/.test(values.username)) errors.push("Nom d'utilisateur invalide");
  if (!values.nom || !values.prenom) errors.push('Nom et prénom requis');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.push('E-mail invalide');
  if (values.password.length < 8) errors.push('Mot de passe : 8 caractères minimum');

  if (errors.length) {
    setFlash(req, 'error', errors.join(' · '));
    return res.redirect('/admin/agents');
  }

  try {
    await pool.query(
      'INSERT INTO agents (username, nom, prenom, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
      [values.username, values.nom, values.prenom, values.email, hashPassword(values.password), values.role]
    );
    setFlash(req, 'success', 'Compte agent créé');
  } catch (error) {
    setFlash(req, 'error', error.code === 'ER_DUP_ENTRY' ? 'Cet identifiant ou e-mail existe déjà' : 'Création impossible');
  }
  return res.redirect('/admin/agents');
}));

router.get('/statistiques', asyncRoute(async (req, res) => {
  const [[byState], [byFiliere], [totals]] = await Promise.all([
    pool.query('SELECT etat, COUNT(*) AS total FROM dossiers GROUP BY etat'),
    pool.query('SELECT filiere, COUNT(*) AS total FROM dossiers GROUP BY filiere ORDER BY total DESC'),
    pool.query(`SELECT (SELECT COUNT(*) FROM etudiants) AS etudiants,
                       (SELECT COUNT(*) FROM agents) AS agents,
                       (SELECT COUNT(*) FROM dossiers) AS dossiers,
                       (SELECT COUNT(*) FROM pieces) AS pieces`)
  ]);
  res.render('admin/stats', {
    title: 'Statistiques',
    byState,
    byFiliere,
    totals: totals[0],
    maxFiliere: Math.max(1, ...byFiliere.map((row) => row.total))
  });
}));

module.exports = router;
