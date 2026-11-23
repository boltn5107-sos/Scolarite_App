const path = require('node:path');
const fs = require('node:fs/promises');
const config = require('./config');
const { pool } = require('./db');
const { hashPassword } = require('./security');
const {
  buildIdentityDocument,
  buildTranscript,
  buildReceipt,
  buildPhoto,
  buildCoverSheet
} = require('./pdf');
const { FILIERES, NIVEAUX, TYPES_PIECES } = require('./referentials');

const NOMS = ['Diagne', 'Faye', 'Ndiaye', 'Sow', 'Mbaye', 'Fall', 'Sy', 'Gueye', 'Traore', 'Diallo', 'Bamba', 'Cisse'];
const PRENOMS = ['Aminata', 'Moussa', 'Fatou', 'Ibrahima', 'Awa', 'Cheikh', 'Marieme', 'Ousmane', 'Ndeye', 'Pape', 'Ramatou', 'Lamine'];

function random(seed) {
  let value = seed;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

async function insertBatch(table, columns, rows) {
  const placeholders = rows.map(() => `(?${', ?'.repeat(columns.length - 1)})`).join(', ');
  const values = rows.flat();
  await pool.query(`INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`, values);
}

async function seed() {
  const next = random(20262026);
  const passwordHash = hashPassword(config.seedPassword);

  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  await pool.query('DELETE FROM pieces');
  await pool.query('DELETE FROM dossiers');
  await pool.query('DELETE FROM agents');
  await pool.query('DELETE FROM etudiants');
  await pool.query('ALTER TABLE pieces AUTO_INCREMENT = 1');
  await pool.query('ALTER TABLE dossiers AUTO_INCREMENT = 1');
  await pool.query('ALTER TABLE agents AUTO_INCREMENT = 1');
  await pool.query('ALTER TABLE etudiants AUTO_INCREMENT = 1');
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');

  await fs.mkdir(config.uploadDir, { recursive: true });
  const date = new Date().toLocaleDateString('fr-FR');
  const sampleStudent = { numero_etudiant: 'ETU20250001', nom: 'Diagne', prenom: 'Aminata' };
  const sampleDossier = { id: 1, annee: config.year, filiere: FILIERES[0], niveau: NIVEAUX[0] };
  const common = { student: sampleStudent, dossier: sampleDossier, version: config.version, vmName: config.vmName, date };

  const templates = {
    carte_identite: buildIdentityDocument(common),
    releve_notes: buildTranscript(common),
    photo: buildPhoto(common),
    recu_paiement: buildReceipt(common),
    cover: buildCoverSheet(common)
  };

  const files = {
    'piece-exemple.pdf': templates.cover,
    'exemple-piece.pdf': templates.cover,
    'carte-identite-specimen.pdf': templates.carte_identite,
    'releve-notes-specimen.pdf': templates.releve_notes,
    'photo-identite-specimen.pdf': templates.photo,
    'recu-paiement-specimen.pdf': templates.recu_paiement
  };
  await Promise.all(Object.entries(files).map(([name, buffer]) => fs.writeFile(path.join(config.uploadDir, name), buffer)));

  const students = [];
  for (let index = 1; index <= 500; index += 1) {
    students.push([
      `ETU2025${String(index).padStart(4, '0')}`,
      NOMS[index % NOMS.length],
      PRENOMS[(index * 5) % PRENOMS.length],
      `etu${index}@universite-du-saloum.sn`,
      FILIERES[index % FILIERES.length],
      NIVEAUX[index % NIVEAUX.length],
      passwordHash
    ]);
  }
  for (let offset = 0; offset < students.length; offset += 50) {
    await insertBatch('etudiants', ['numero_etudiant', 'nom', 'prenom', 'email', 'filiere', 'niveau', 'password_hash'], students.slice(offset, offset + 50));
  }

  await insertBatch('agents', ['username', 'nom', 'prenom', 'email', 'password_hash', 'role'], [
    ['admin', 'Ndiaye', 'Mamadou', 'admin@universite-du-saloum.sn', passwordHash, 'admin'],
    ['agent1', 'Faye', 'Aissa', 'agent1@universite-du-saloum.sn', passwordHash, 'agent'],
    ['agent2', 'Sow', 'Moustapha', 'agent2@universite-du-saloum.sn', passwordHash, 'agent']
  ]);

  const dossiers = [];
  const etatsPoids = ['en attente', 'en attente', 'en attente', 'validé', 'validé', 'validé', 'validé', 'rejeté'];
  for (let index = 1; index <= 300; index += 1) {
    const etat = etatsPoids[Math.floor(next() * etatsPoids.length)];
    const filiere = FILIERES[index % FILIERES.length];
    dossiers.push([
      index,
      config.year,
      filiere,
      NIVEAUX[index % NIVEAUX.length],
      etat,
      etat === 'rejeté' ? 'Pièce illisible, veuillez la déposer à nouveau' : null,
      etat === 'en attente' ? null : 2 + Math.floor(next() * 2)
    ]);
  }
  for (let offset = 0; offset < dossiers.length; offset += 50) {
    await insertBatch('dossiers', ['etudiant_id', 'annee', 'filiere', 'niveau', 'etat', 'commentaire', 'agent_id'], dossiers.slice(offset, offset + 50));
  }

  const [rows] = await pool.query('SELECT id FROM dossiers ORDER BY id');
  const pieces = [];
  const types = Object.keys(TYPES_PIECES);
  const pieceFiles = {
    carte_identite: { name: 'carte-identite-specimen.pdf', buffer: templates.carte_identite },
    releve_notes: { name: 'releve-notes-specimen.pdf', buffer: templates.releve_notes },
    photo: { name: 'photo-identite-specimen.pdf', buffer: templates.photo },
    recu_paiement: { name: 'recu-paiement-specimen.pdf', buffer: templates.recu_paiement }
  };
  rows.forEach((dossier, index) => {
    const count = 1 + Math.floor(next() * 2);
    for (let pieceIndex = 0; pieceIndex < count; pieceIndex += 1) {
      const type = types[(index + pieceIndex) % types.length];
      const file = pieceFiles[type];
      pieces.push([
        dossier.id,
        type,
        file.name,
        file.name,
        file.buffer.length,
        'application/pdf'
      ]);
    }
  });
  for (let offset = 0; offset < pieces.length; offset += 50) {
    await insertBatch('pieces', ['dossier_id', 'type', 'nom_fichier', 'chemin', 'taille', 'mime_type'], pieces.slice(offset, offset + 50));
  }

  process.stdout.write(`Donnees de test chargees : ${students.length} etudiants, 3 agents, ${dossiers.length} dossiers, ${pieces.length} pieces.\n`);
  process.stdout.write(`Comptes fictifs : admin / agent1 / agent2 - mot de passe : ${config.seedPassword}\n`);
}

seed().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
}).finally(async () => {
  await pool.end();
});
