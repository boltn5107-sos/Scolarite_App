const { toAscii } = require('./security');

const NAVY = '0.031 0.094 0.227';
const YELLOW = '0.949 0.729 0.114';
const WHITE = '1 1 1';
const MUTED = '0.35 0.42 0.51';
const LIGHT = '0.957 0.969 0.976';
const LINE = '0.82 0.85 0.89';
const STRIPE = '0.969 0.976 0.984';
const SUCCESS = '0.071 0.478 0.294';
const WARNING = '0.541 0.392 0';
const CREAM = '1 0.965 0.859';

const num = (value) => Number(value).toFixed(2);

function pdfEscape(value) {
  return toAscii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function text(x, y, value, options = {}) {
  const font = options.font || (options.bold ? 'F2' : 'F1');
  const size = options.size || 11;
  const color = options.color || NAVY;
  return `${color} rg BT /${font} ${size} Tf ${num(x)} ${num(y)} Td (${pdfEscape(value)}) Tj ET`;
}

function rect(x, y, width, height, color) {
  return `${color} rg ${num(x)} ${num(y)} ${num(width)} ${num(height)} re f`;
}

function strokeRect(x, y, width, height, color = LINE, lineWidth = 1) {
  return `${color} RG ${num(lineWidth)} w ${num(x)} ${num(y)} ${num(width)} ${num(height)} re S`;
}

function line(x1, y1, x2, y2, color = LINE, lineWidth = 1) {
  return `${color} RG ${num(lineWidth)} w ${num(x1)} ${num(y1)} m ${num(x2)} ${num(y2)} l S`;
}

function ellipse(cx, cy, rx, ry, color) {
  const k = 0.5522848;
  return [
    `${color} rg`,
    `${num(cx + rx)} ${num(cy)} m`,
    `${num(cx + rx)} ${num(cy + k * ry)} ${num(cx + k * rx)} ${num(cy + ry)} ${num(cx)} ${num(cy + ry)} c`,
    `${num(cx - k * rx)} ${num(cy + ry)} ${num(cx - rx)} ${num(cy + k * ry)} ${num(cx - rx)} ${num(cy)} c`,
    `${num(cx - rx)} ${num(cy - k * ry)} ${num(cx - k * rx)} ${num(cy - ry)} ${num(cx)} ${num(cy - ry)} c`,
    `${num(cx + k * rx)} ${num(cy - ry)} ${num(cx + rx)} ${num(cy - k * ry)} ${num(cx + rx)} ${num(cy)} c`,
    'f'
  ].join(' ');
}

function field(label, value, labelX, valueX, y) {
  return [
    text(labelX, y, label, { font: 'F2', size: 8, color: MUTED }),
    text(valueX, y - 18, value || '-', { font: 'F2', size: 11 })
  ];
}

function header(title, subtitle, badge) {
  const commands = [
    rect(0, 690, 595, 152, NAVY),
    rect(0, 684, 595, 6, YELLOW),
    rect(56, 724, 42, 4, YELLOW),
    text(56, 790, 'UNIVERSITE DU SALOUM', { font: 'F2', size: 13, color: WHITE }),
    text(56, 772, 'SERVICE DE LA SCOLARITE', { size: 9, color: WHITE }),
    text(56, 700, title, { font: 'F2', size: 20, color: WHITE })
  ];
  if (badge) {
    commands.push(rect(420, 740, 120, 30, YELLOW));
    commands.push(text(437, 750, badge, { font: 'F2', size: 9, color: NAVY }));
  }
  if (subtitle) {
    commands.push(text(56, 662, subtitle, { size: 10, color: MUTED }));
  }
  return commands;
}

function footer(version, vmName, rightText = 'Document officiel') {
  return [
    rect(0, 0, 595, 46, NAVY),
    text(56, 20, `Scolarite v${version} - VM ${vmName}`, { size: 8, color: WHITE }),
    text(370, 20, rightText, { font: 'F2', size: 8, color: WHITE })
  ];
}

function renderPdf(commands) {
  const stream = commands.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>',
    `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`
  ];

  let output = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output, 'latin1'));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(output, 'latin1');
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    output += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(output, 'latin1');
}

function buildAttestation({ student, dossier, version, vmName, date }) {
  const reference = `REF DOS-${dossier.id || '0000'}/${String(dossier.annee || '').replace('/', '-')}`;
  const commands = [
    ...header('ATTESTATION D INSCRIPTION', `Annee universitaire ${dossier.annee || ''}`, 'VALIDE'),
    rect(56, 548, 483, 104, LIGHT),
    strokeRect(56, 548, 483, 104),
    text(74, 628, 'ANNEE UNIVERSITAIRE', { font: 'F2', size: 8, color: MUTED }),
    text(74, 610, dossier.annee || '', { font: 'F2', size: 11 }),
    text(320, 628, 'NUMERO ETUDIANT', { font: 'F2', size: 8, color: MUTED }),
    text(320, 610, student.numero_etudiant || '', { font: 'F2', size: 11 }),
    text(74, 582, 'ETUDIANT', { font: 'F2', size: 8, color: MUTED }),
    text(74, 564, `${student.prenom || ''} ${student.nom || ''}`, { font: 'F2', size: 12 }),
    text(320, 582, 'FILIERE / NIVEAU', { font: 'F2', size: 8, color: MUTED }),
    text(320, 564, `${dossier.filiere || ''} - ${dossier.niveau || ''}`, { font: 'F2', size: 11 }),
    text(56, 505, 'Le service de la scolarite atteste que le dossier susmentionne a ete', { size: 11 }),
    text(56, 486, 'valide pour l annee universitaire en cours.', { size: 11 }),
    text(56, 450, reference, { font: 'F2', size: 9, color: MUTED }),
    text(56, 430, `Delivree le ${date}`, { size: 10, color: MUTED }),
    line(56, 210, 276, 210, MUTED),
    text(56, 194, 'Le responsable de la scolarite', { font: 'F2', size: 9 }),
    text(56, 178, 'Universite du Saloum', { size: 9, color: MUTED }),
    ...footer(version, vmName)
  ];
  return renderPdf(commands);
}

function buildIdentityDocument({ student, dossier, version, vmName }) {
  const idNumber = `SN-${student.numero_etudiant || '00000000'}`;
  const commands = [
    ...header("COPIE DE LA CARTE D'IDENTITE", 'Document de demonstration - specimen', 'SPECIMEN'),
    rect(56, 520, 483, 140, LIGHT),
    strokeRect(56, 520, 483, 140),
    rect(72, 534, 86, 112, '0.86 0.90 0.94'),
    strokeRect(72, 534, 86, 112),
    ellipse(115, 605, 21, 25, '0.62 0.69 0.76'),
    ellipse(115, 558, 33, 20, '0.62 0.69 0.76'),
    ...field('NOM', student.nom, 180, 180, 638),
    ...field('PRENOMS', student.prenom, 300, 300, 638),
    ...field('NUMERO', idNumber, 180, 180, 596),
    ...field('FILIERE', dossier.filiere, 300, 300, 596),
    ...field('NIVEAU', dossier.niveau, 180, 180, 554),
    ...field('ANNEE', dossier.annee, 300, 300, 554),
    rect(56, 428, 483, 74, '0.963 0.973 0.980'),
    strokeRect(56, 428, 483, 74),
    text(66, 480, `IDU${idNumber.replace(/[^A-Z0-9]/gi, '')}<<${student.nom || ''}<<${student.prenom || ''}`, { font: 'F3', size: 10 }),
    text(66, 456, `${student.numero_etudiant || ''}  ${dossier.filiere || ''}  ${dossier.niveau || ''}  ${dossier.annee || ''}`, { font: 'F3', size: 10, color: MUTED }),
    text(56, 396, 'Copie conforme au document original presentee pour le dossier d inscription.', { size: 10, color: MUTED }),
    ...footer(version, vmName, 'Piece justificative')
  ];
  return renderPdf(commands);
}

function buildTranscript({ student, dossier, version, vmName }) {
  const subjects = [
    ['Fondamentaux du cloud', '3', '15', 'Tres bien'],
    ['Reseaux et systemes', '2', '13', 'Bien'],
    ['Base de donnees', '3', '14', 'Bien'],
    ['Developpement web', '2', '16', 'Tres bien'],
    ['Communication professionnelle', '1', '12', 'Assez bien']
  ];
  const commands = [
    ...header('RELEVE DE NOTES', `${dossier.annee || ''} - ${dossier.filiere || ''} ${dossier.niveau || ''}`, 'SPECIMEN'),
    rect(56, 610, 483, 44, LIGHT),
    strokeRect(56, 610, 483, 44),
    text(70, 636, `ETUDIANT : ${student.prenom || ''} ${student.nom || ''}`, { font: 'F2', size: 10 }),
    text(70, 620, `NUMERO : ${student.numero_etudiant || ''}`, { size: 9, color: MUTED }),
    text(360, 636, 'SEMESTRE 1', { font: 'F2', size: 10 }),
    text(360, 620, 'SESSION NORMALE', { size: 9, color: MUTED }),
    rect(56, 578, 483, 26, NAVY),
    text(70, 588, 'MATIERE', { font: 'F2', size: 9, color: WHITE }),
    text(330, 588, 'COEF', { font: 'F2', size: 9, color: WHITE }),
    text(390, 588, 'NOTE', { font: 'F2', size: 9, color: WHITE }),
    text(440, 588, 'APPRECIATION', { font: 'F2', size: 9, color: WHITE })
  ];

  subjects.forEach(([subject, coef, grade, mention], index) => {
    const y = 552 - index * 34;
    commands.push(index % 2 === 0 ? rect(56, y, 483, 34, STRIPE) : rect(56, y, 483, 34, WHITE));
    commands.push(text(70, y + 12, subject, { size: 10 }));
    commands.push(text(330, y + 12, coef, { size: 10 }));
    commands.push(text(390, y + 12, grade, { font: 'F2', size: 10 }));
    commands.push(text(440, y + 12, mention, { size: 9, color: MUTED }));
  });

  const summaryY = 552 - subjects.length * 34;
  commands.push(rect(56, summaryY, 483, 34, YELLOW));
  commands.push(text(70, summaryY + 12, 'MOYENNE GENERALE', { font: 'F2', size: 10, color: NAVY }));
  commands.push(text(390, summaryY + 12, '14,00/20', { font: 'F2', size: 10, color: NAVY }));
  commands.push(text(440, summaryY + 12, 'ADMIS', { font: 'F2', size: 9, color: NAVY }));
  commands.push(text(56, summaryY - 28, 'Releve genere pour le dossier d inscription - document de demonstration.', { size: 9, color: MUTED }));
  commands.push(...footer(version, vmName, 'Piece justificative'));
  return renderPdf(commands);
}

function buildReceipt({ student, dossier, version, vmName, date }) {
  const reference = `REC-${String(student.numero_etudiant || '0000').slice(-6)}-2026`;
  const commands = [
    ...header('RECU DE PAIEMENT', 'Frais de scolarite - universite du Saloum', 'PAYE'),
    rect(56, 548, 483, 96, YELLOW),
    text(74, 616, 'MONTANT PAYE', { font: 'F2', size: 9, color: NAVY }),
    text(74, 580, '150 000 FCFA', { font: 'F2', size: 26, color: NAVY }),
    text(360, 610, 'MODE DE PAIEMENT', { font: 'F2', size: 8, color: NAVY }),
    text(360, 590, 'Mobile money / Especes', { size: 10, color: NAVY }),
    text(360, 570, reference, { font: 'F3', size: 9, color: NAVY }),
    rect(56, 400, 483, 128, LIGHT),
    strokeRect(56, 400, 483, 128),
    ...field('ETUDIANT', `${student.prenom || ''} ${student.nom || ''}`, 74, 74, 504),
    ...field('NUMERO ETUDIANT', student.numero_etudiant, 290, 290, 504),
    ...field('FILIERE', dossier.filiere, 74, 74, 462),
    ...field('NIVEAU', dossier.niveau, 290, 290, 462),
    ...field('DATE', date, 74, 74, 420),
    rect(390, 290, 130, 44, YELLOW),
    text(410, 308, 'ACQUITTE', { font: 'F2', size: 14, color: NAVY }),
    text(56, 300, 'Recu remis a l etudiant apres reglement des frais de scolarite.', { size: 10, color: MUTED }),
    line(56, 220, 276, 220),
    text(56, 204, 'Le caissier', { font: 'F2', size: 9 }),
    ...footer(version, vmName, 'Piece justificative')
  ];
  return renderPdf(commands);
}

function buildPhoto({ student, dossier, version, vmName }) {
  const commands = [
    ...header("PHOTO D'IDENTITE", 'Format 35 x 45 mm - fond clair', 'SPECIMEN'),
    rect(187, 300, 220, 300, NAVY),
    rect(193, 306, 208, 288, '0.82 0.90 0.96'),
    ellipse(297, 470, 48, 58, '0.62 0.69 0.76'),
    ellipse(297, 380, 76, 48, '0.62 0.69 0.76'),
    rect(187, 276, 220, 16, YELLOW),
    text(200, 281, `${student.numero_etudiant || ''} - ${dossier.niveau || ''}`, { font: 'F2', size: 8, color: NAVY }),
    text(187, 248, `${student.prenom || ''} ${student.nom || ''}`, { font: 'F2', size: 14 }),
    text(187, 228, `${dossier.filiere || ''} - ${dossier.annee || ''}`, { size: 10, color: MUTED }),
    ...footer(version, vmName, 'Piece justificative')
  ];
  return renderPdf(commands);
}

function buildCoverSheet({ student, dossier, version, vmName, date }) {
  const items = [
    'Copie de la carte d identite',
    'Releve de notes',
    'Photo d identite',
    'Recu de paiement'
  ];
  const commands = [
    ...header('DOSSIER DE PIECES JUSTIFICATIVES', 'Modele de demonstration - inscription en ligne', 'SPECIMEN'),
    rect(56, 548, 483, 94, LIGHT),
    strokeRect(56, 548, 483, 94),
    text(74, 618, 'ETUDIANT', { font: 'F2', size: 8, color: MUTED }),
    text(74, 598, `${student.prenom || ''} ${student.nom || ''}`, { font: 'F2', size: 13 }),
    text(320, 618, 'NUMERO ETUDIANT', { font: 'F2', size: 8, color: MUTED }),
    text(320, 598, student.numero_etudiant || '', { font: 'F2', size: 12 }),
    text(74, 568, `${dossier.filiere || ''} - ${dossier.niveau || ''} - ${dossier.annee || ''}`, { size: 10, color: MUTED })
  ];

  items.forEach((item, index) => {
    const y = 504 - index * 42;
    commands.push(rect(56, y, 483, 34, index % 2 === 0 ? STRIPE : WHITE));
    commands.push(strokeRect(56, y, 483, 34));
    commands.push(rect(70, y + 9, 16, 16, YELLOW));
    commands.push(text(74, y + 14, 'X', { font: 'F2', size: 9, color: NAVY }));
    commands.push(text(100, y + 13, item, { size: 11 }));
    commands.push(text(470, y + 13, 'OK', { font: 'F2', size: 9, color: SUCCESS }));
  });

  commands.push(rect(56, 304, 483, 56, CREAM));
  commands.push(text(70, 334, 'Ce dossier est un specimen genere automatiquement pour la demonstration.', { size: 10, color: WARNING }));
  commands.push(text(70, 318, `Genere le ${date} par le service de la scolarite.`, { size: 9, color: WARNING }));
  commands.push(...footer(version, vmName, 'Dossier complet'));
  return renderPdf(commands);
}

module.exports = {
  buildAttestation,
  buildIdentityDocument,
  buildTranscript,
  buildReceipt,
  buildPhoto,
  buildCoverSheet
};
