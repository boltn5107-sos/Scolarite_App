const express = require('express');
const config = require('../config');
const { pool } = require('../db');
const storage = require('../storage');
const { buildAttestation } = require('../pdf');
const { asyncRoute, setFlash } = require('../middleware');
const { uploadPiece } = require('../upload');
const { FILIERES, NIVEAUX, TYPES_PIECES, ETATS } = require('../referentials');

const router = express.Router();

router.get('/', asyncRoute(async (req, res) => {
  const id = req.session.user.id;
  const [[counts], [dossiers]] = await Promise.all([
    pool.query(
      `SELECT etat, COUNT(*) AS total FROM dossiers WHERE etudiant_id = ? GROUP BY etat`,
      [id]
    ),
    pool.query(
      `SELECT d.*, (SELECT COUNT(*) FROM pieces p WHERE p.dossier_id = d.id) AS nb_pieces
       FROM dossiers d WHERE d.etudiant_id = ? ORDER BY d.created_at DESC LIMIT 5`,
      [id]
    )
  ]);
  const stats = Object.fromEntries(ETATS.map((etat) => [etat, 0]));
  counts.forEach((row) => { stats[row.etat] = row.total; });
  res.render('student/dashboard', {
    title: 'Tableau de bord',
    stats,
    dossiers,
    total: Object.values(stats).reduce((a, b) => a + b, 0)
  });
}));

router.get('/dossiers', asyncRoute(async (req, res) => {
  const conditions = ['d.etudiant_id = ?'];
  const params = [req.session.user.id];

  if (ETATS.includes(req.query.etat)) {
    conditions.push('d.etat = ?');
    params.push(req.query.etat);
  }
  if (FILIERES.includes(req.query.filiere)) {
    conditions.push('d.filiere = ?');
    params.push(req.query.filiere);
  }

  const [[counts], [dossiers]] = await Promise.all([
    pool.query('SELECT etat, COUNT(*) AS total FROM dossiers WHERE etudiant_id = ? GROUP BY etat', [req.session.user.id]),
    pool.query(
      `SELECT d.*, (SELECT COUNT(*) FROM pieces p WHERE p.dossier_id = d.id) AS nb_pieces
       FROM dossiers d WHERE ${conditions.join(' AND ')} ORDER BY d.created_at DESC`,
      params
    )
  ]);
  const stats = Object.fromEntries(ETATS.map((etat) => [etat, 0]));
  counts.forEach((row) => { stats[row.etat] = row.total; });

  res.render('student/dossiers', {
    title: 'Mes dossiers',
    dossiers,
    stats,
    etats: ETATS,
    filieres: FILIERES,
    filters: { etat: req.query.etat || '', filiere: req.query.filiere || '' }
  });
}));

router.get('/pieces', asyncRoute(async (req, res) => {
  const [pieces] = await pool.query(
    `SELECT p.*, d.id AS dossier_id, d.filiere, d.niveau
     FROM pieces p JOIN dossiers d ON d.id = p.dossier_id
     WHERE d.etudiant_id = ? ORDER BY p.created_at DESC`,
    [req.session.user.id]
  );
  res.render('student/pieces', { title: 'Mes pièces', pieces, types: TYPES_PIECES });
}));

router.get('/attestations', asyncRoute(async (req, res) => {
  const [dossiers] = await pool.query(
    `SELECT d.*, e.numero_etudiant, e.nom, e.prenom
     FROM dossiers d JOIN etudiants e ON e.id = d.etudiant_id
     WHERE d.etudiant_id = ? AND d.etat = 'validé' ORDER BY d.updated_at DESC`,
    [req.session.user.id]
  );
  res.render('student/attestations', { title: 'Mes attestations', dossiers });
}));

router.get('/piece/nouveau', asyncRoute(async (req, res) => {
  const [dossiers] = await pool.query(
    'SELECT id, filiere, niveau, etat, created_at FROM dossiers WHERE etudiant_id = ? ORDER BY created_at DESC',
    [req.session.user.id]
  );
  res.render('student/piece-new', { title: 'Déposer une pièce', dossiers, types: TYPES_PIECES });
}));

router.post('/piece/nouveau', uploadPiece, asyncRoute(async (req, res) => {
  const dossierId = Number(req.body.dossier_id);
  if (!TYPES_PIECES[req.body.type] || !req.file) {
    setFlash(req, 'error', 'Veuillez choisir un dossier, un type et un fichier valides');
    return res.redirect('/etudiant/piece/nouveau');
  }

  const [rows] = await pool.query('SELECT id FROM dossiers WHERE id = ? AND etudiant_id = ?', [dossierId, req.session.user.id]);
  if (!rows.length) {
    setFlash(req, 'error', 'Dossier introuvable');
    return res.redirect('/etudiant/piece/nouveau');
  }

  const key = await storage.save(req.file);
  await pool.query(
    'INSERT INTO pieces (dossier_id, type, nom_fichier, chemin, taille, mime_type) VALUES (?, ?, ?, ?, ?, ?)',
    [dossierId, req.body.type, req.file.originalname, key, req.file.size, req.file.mimetype]
  );
  setFlash(req, 'success', 'Pièce justificative déposée');
  return res.redirect('/etudiant/pieces');
}));

router.get('/dossier/nouveau', (req, res) => {
  res.render('student/dossier-new', {
    title: 'Nouvelle demande',
    filieres: FILIERES,
    niveaux: NIVEAUX,
    values: { filiere: '', niveau: '' }
  });
});

router.post('/dossier', asyncRoute(async (req, res) => {
  const filiere = String(req.body.filiere || '');
  const niveau = String(req.body.niveau || '');

  if (!FILIERES.includes(filiere) || !NIVEAUX.includes(niveau)) {
    setFlash(req, 'error', 'Veuillez choisir une filière et un niveau valides');
    return res.redirect('/etudiant/dossier/nouveau');
  }

  const [result] = await pool.query(
    'INSERT INTO dossiers (etudiant_id, annee, filiere, niveau, etat) VALUES (?, ?, ?, ?, ?)',
    [req.session.user.id, config.year, filiere, niveau, 'en attente']
  );
  setFlash(req, 'success', 'Votre demande a été enregistrée');
  return res.redirect(`/etudiant/dossier/${result.insertId}`);
}));

router.get('/dossier/:id', asyncRoute(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM dossiers WHERE id = ? AND etudiant_id = ?',
    [req.params.id, req.session.user.id]
  );
  if (!rows.length) return res.status(404).render('error', { title: 'Introuvable', code: 404, message: 'Dossier introuvable' });

  const [pieces] = await pool.query('SELECT * FROM pieces WHERE dossier_id = ? ORDER BY created_at DESC', [req.params.id]);
  return res.render('student/dossier', {
    title: `Dossier ${rows[0].id}`,
    dossier: rows[0],
    pieces,
    types: TYPES_PIECES,
    values: { type: 'carte_identite' }
  });
}));

router.post('/dossier/:id/piece', uploadPiece, asyncRoute(async (req, res) => {
  const [rows] = await pool.query('SELECT id FROM dossiers WHERE id = ? AND etudiant_id = ?', [req.params.id, req.session.user.id]);
  if (!rows.length) return res.status(404).render('error', { title: 'Introuvable', code: 404, message: 'Dossier introuvable' });
  if (!req.file) {
    setFlash(req, 'error', 'Veuillez sélectionner un fichier');
    return res.redirect(`/etudiant/dossier/${req.params.id}`);
  }
  if (!TYPES_PIECES[req.body.type]) {
    setFlash(req, 'error', 'Type de pièce invalide');
    return res.redirect(`/etudiant/dossier/${req.params.id}`);
  }

  const key = await storage.save(req.file);
  await pool.query(
    'INSERT INTO pieces (dossier_id, type, nom_fichier, chemin, taille, mime_type) VALUES (?, ?, ?, ?, ?, ?)',
    [req.params.id, req.body.type, req.file.originalname, key, req.file.size, req.file.mimetype]
  );
  setFlash(req, 'success', 'Pièce justificative déposée');
  return res.redirect(`/etudiant/dossier/${req.params.id}`);
}));

router.get('/piece/:id/download', asyncRoute(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT p.* FROM pieces p
     JOIN dossiers d ON d.id = p.dossier_id
     WHERE p.id = ? AND d.etudiant_id = ?`,
    [req.params.id, req.session.user.id]
  );
  if (!rows.length) return res.sendStatus(404);

  const piece = rows[0];
  res.setHeader('Content-Disposition', `inline; filename="${piece.nom_fichier.replace(/[^\w.\-]/g, '_')}"`);
  res.setHeader('Content-Type', piece.mime_type);
  return res.sendFile(storage.getPath(piece.chemin));
}));

router.get('/dossier/:id/attestation', asyncRoute(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT d.*, e.numero_etudiant, e.nom, e.prenom
     FROM dossiers d JOIN etudiants e ON e.id = d.etudiant_id
     WHERE d.id = ? AND d.etudiant_id = ?`,
    [req.params.id, req.session.user.id]
  );
  if (!rows.length) return res.sendStatus(404);
  const dossier = rows[0];
  if (dossier.etat !== 'validé') {
    setFlash(req, 'error', "L'attestation est disponible uniquement pour un dossier validé");
    return res.redirect(`/etudiant/dossier/${dossier.id}`);
  }

  const pdf = buildAttestation({
    student: dossier,
    dossier,
    version: config.version,
    vmName: config.vmName,
    date: new Date().toLocaleDateString('fr-FR')
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="attestation-${dossier.id}.pdf"`);
  return res.send(pdf);
}));

module.exports = router;
