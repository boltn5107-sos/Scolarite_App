const express = require('express');
const { pool } = require('../db');
const { verifyPassword, hashPassword } = require('../security');
const { asyncRoute, setFlash } = require('../middleware');
const { FILIERES, NIVEAUX } = require('../referentials');

const router = express.Router();

function redirectFor(user) {
  if (user.role === 'etudiant') return '/etudiant';
  if (user.role === 'admin') return '/admin/statistiques';
  return '/agent/dossiers';
}

router.get('/', (req, res) => {
  res.redirect(req.session.user ? redirectFor(req.session.user) : '/login');
});

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect(redirectFor(req.session.user));
  return res.render('login', { title: 'Connexion', profil: req.query.profil || 'etudiant' });
});

router.post('/login', asyncRoute(async (req, res) => {
  const identifiant = String(req.body.identifiant || '').trim();
  const password = String(req.body.password || '');
  const demandé = req.body.profil === 'agent' ? 'agent' : 'etudiant';

  if (!identifiant || !password) {
    setFlash(req, 'error', 'Veuillez renseigner tous les champs');
    return res.redirect(`/login?profil=${demandé}`);
  }

  if (demandé === 'etudiant') {
    const [rows] = await pool.query(
      'SELECT * FROM etudiants WHERE numero_etudiant = ? OR email = ? LIMIT 1',
      [identifiant, identifiant]
    );
    const student = rows[0];
    if (student && verifyPassword(password, student.password_hash)) {
      req.session.user = {
        id: student.id,
        role: 'etudiant',
        nom: student.nom,
        prenom: student.prenom,
        identifiant: student.numero_etudiant
      };
      setFlash(req, 'success', `Bienvenue ${student.prenom}`);
      return res.redirect('/etudiant');
    }
  } else {
    const [rows] = await pool.query(
      'SELECT * FROM agents WHERE username = ? OR email = ? LIMIT 1',
      [identifiant, identifiant]
    );
    const agent = rows[0];
    if (agent && verifyPassword(password, agent.password_hash)) {
      req.session.user = {
        id: agent.id,
        role: agent.role,
        nom: agent.nom,
        prenom: agent.prenom,
        identifiant: agent.username
      };
      setFlash(req, 'success', `Bienvenue ${agent.prenom}`);
      return res.redirect(redirectFor(req.session.user));
    }
  }

  setFlash(req, 'error', 'Identifiant ou mot de passe incorrect');
  return res.redirect(`/login?profil=${demandé}`);
}));

router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect(redirectFor(req.session.user));
  return res.render('register', {
    title: 'Créer un compte',
    filieres: FILIERES,
    niveaux: NIVEAUX,
    values: {}
  });
});

router.post('/register', asyncRoute(async (req, res) => {
  const values = {
    numero_etudiant: String(req.body.numero_etudiant || '').trim().toUpperCase(),
    nom: String(req.body.nom || '').trim(),
    prenom: String(req.body.prenom || '').trim(),
    email: String(req.body.email || '').trim().toLowerCase(),
    filiere: String(req.body.filiere || ''),
    niveau: String(req.body.niveau || ''),
    password: String(req.body.password || '')
  };
  const errors = [];

  if (!/^[A-Z0-9-]{3,30}$/.test(values.numero_etudiant)) errors.push('Numéro étudiant invalide');
  if (values.nom.length < 2 || values.prenom.length < 2) errors.push('Nom et prénom requis');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.push('Adresse e-mail invalide');
  if (!FILIERES.includes(values.filiere)) errors.push('Filière invalide');
  if (!NIVEAUX.includes(values.niveau)) errors.push('Niveau invalide');
  if (values.password.length < 8) errors.push('Mot de passe : 8 caractères minimum');

  if (errors.length) {
    res.locals.flash = [{ type: 'error', message: errors.join(' · ') }];
    return res.render('register', { title: 'Créer un compte', filieres: FILIERES, niveaux: NIVEAUX, values });
  }

  const [existing] = await pool.query(
    'SELECT id FROM etudiants WHERE numero_etudiant = ? OR email = ? LIMIT 1',
    [values.numero_etudiant, values.email]
  );
  if (existing.length) {
    res.locals.flash = [{ type: 'error', message: 'Ce numéro étudiant ou cette adresse e-mail existe déjà' }];
    return res.render('register', { title: 'Créer un compte', filieres: FILIERES, niveaux: NIVEAUX, values });
  }

  const [result] = await pool.query(
    'INSERT INTO etudiants (numero_etudiant, nom, prenom, email, filiere, niveau, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [values.numero_etudiant, values.nom, values.prenom, values.email, values.filiere, values.niveau, hashPassword(values.password)]
  );

  req.session.user = {
    id: result.insertId,
    role: 'etudiant',
    nom: values.nom,
    prenom: values.prenom,
    identifiant: values.numero_etudiant
  };
  setFlash(req, 'success', 'Votre compte a été créé');
  return res.redirect('/etudiant');
}));

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

router.get('/acces-refuse', (req, res) => {
  res.status(403).render('error', { title: 'Accès refusé', code: 403, message: "Vous n'avez pas accès à cette page" });
});

module.exports = router;
