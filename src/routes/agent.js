const express = require('express');
const { pool } = require('../db');
const storage = require('../storage');
const { asyncRoute, setFlash } = require('../middleware');
const { FILIERES, TYPES_PIECES, ETATS } = require('../referentials');

const router = express.Router();

function buildFilters(query) {
  const conditions = [];
  const params = [];
  if (FILIERES.includes(query.filiere)) {
    conditions.push('d.filiere = ?');
    params.push(query.filiere);
  }
  if (ETATS.includes(query.etat)) {
    conditions.push('d.etat = ?');
    params.push(query.etat);
  }
  if (query.q && String(query.q).trim()) {
    conditions.push('(e.nom LIKE ? OR e.prenom LIKE ? OR e.numero_etudiant LIKE ?)');
    const like = `%${String(query.q).trim()}%`;
    params.push(like, like, like);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

router.get('/dossiers', asyncRoute(async (req, res) => {
  const { where, params } = buildFilters(req.query);
  const [dossiers] = await pool.query(
    `SELECT d.*, e.nom, e.prenom, e.numero_etudiant,
            (SELECT COUNT(*) FROM pieces p WHERE p.dossier_id = d.id) AS nb_pieces
     FROM dossiers d JOIN etudiants e ON e.id = d.etudiant_id
     ${where} ORDER BY d.created_at DESC LIMIT 200`,
    params
  );
  const [counts] = await pool.query('SELECT etat, COUNT(*) AS total FROM dossiers GROUP BY etat');
  const stats = Object.fromEntries(ETATS.map((etat) => [etat, 0]));
  counts.forEach((row) => { stats[row.etat] = row.total; });

  res.render('agent/dossiers', {
    title: 'Dossiers',
    dossiers,
    stats,
    filieres: FILIERES,
    etats: ETATS,
    filters: { filiere: req.query.filiere || '', etat: req.query.etat || '', q: req.query.q || '' }
  });
}));

router.get('/dossiers/:id', asyncRoute(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT d.*, e.nom, e.prenom, e.numero_etudiant, e.email
     FROM dossiers d JOIN etudiants e ON e.id = d.etudiant_id WHERE d.id = ?`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).render('error', { title: 'Introuvable', code: 404, message: 'Dossier introuvable' });

  const [pieces] = await pool.query('SELECT * FROM pieces WHERE dossier_id = ? ORDER BY created_at DESC', [req.params.id]);
  return res.render('agent/dossier', {
    title: `Dossier ${rows[0].id}`,
    dossier: rows[0],
    pieces,
    types: TYPES_PIECES,
    etats: ETATS
  });
}));

router.post('/dossiers/:id/decision', asyncRoute(async (req, res) => {
  const etat = String(req.body.etat || '');
  const commentaire = String(req.body.commentaire || '').trim();

  if (!ETATS.includes(etat) || etat === 'en attente') {
    setFlash(req, 'error', 'Décision invalide');
    return res.redirect(`/agent/dossiers/${req.params.id}`);
  }
  if (etat === 'rejeté' && !commentaire) {
    setFlash(req, 'error', 'Un commentaire est obligatoire pour un rejet');
    return res.redirect(`/agent/dossiers/${req.params.id}`);
  }

  await pool.query(
    'UPDATE dossiers SET etat = ?, commentaire = ?, agent_id = ?, updated_at = NOW() WHERE id = ?',
    [etat, commentaire || null, req.session.user.id, req.params.id]
  );
  setFlash(req, 'success', etat === 'validé' ? 'Dossier validé' : 'Dossier rejeté');
  return res.redirect(`/agent/dossiers/${req.params.id}`);
}));

router.get('/pieces/:id/download', asyncRoute(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM pieces WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.sendStatus(404);
  const piece = rows[0];
  res.setHeader('Content-Disposition', `inline; filename="${piece.nom_fichier.replace(/[^\w.\-]/g, '_')}"`);
  res.setHeader('Content-Type', piece.mime_type);
  return res.sendFile(storage.getPath(piece.chemin));
}));

module.exports = router;
