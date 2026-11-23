const { toAscii } = require('./security');

const NAVY = '0.031 0.094 0.227';
const YELLOW = '0.949 0.729 0.114';
const WHITE = '1 1 1';
const MUTED = '0.35 0.42 0.51';
const LIGHT = '0.957 0.969 0.976';

function pdfEscape(value) {
  return toAscii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function text(x, y, value, options = {}) {
  const font = options.bold ? 'F2' : 'F1';
  const size = options.size || 11;
  const color = options.color || NAVY;
  return `${color} rg BT /${font} ${size} Tf ${x} ${y} Td (${pdfEscape(value)}) Tj ET`;
}

function buildAttestation({ student, dossier, version, vmName, date }) {
  const reference = `REF DOS-${dossier.id || '0000'}/${String(dossier.annee || '').replace('/', '-')}`;
  const commands = [
    `${NAVY} rg 0 690 595 152 re f`,
    `${YELLOW} rg 0 684 595 6 re f`,
    `${YELLOW} rg 56 724 42 4 re f`,
    `${YELLOW} rg 430 740 110 30 re f`,
    text(56, 790, 'UNIVERSITE DU SALOUM', { bold: true, size: 13, color: WHITE }),
    text(56, 772, 'SERVICE DE LA SCOLARITE', { size: 9, color: WHITE }),
    text(56, 700, 'ATTESTATION D INSCRIPTION', { bold: true, size: 20, color: WHITE }),
    text(448, 750, 'VALIDE', { bold: true, size: 10, color: NAVY }),
    `${LIGHT} rg 56 548 483 104 re f`,
    `${NAVY} RG 1 w 56 548 483 104 re S`,
    text(74, 628, 'ANNEE UNIVERSITAIRE', { bold: true, size: 8, color: MUTED }),
    text(74, 610, dossier.annee || '', { bold: true, size: 11 }),
    text(320, 628, 'NUMERO ETUDIANT', { bold: true, size: 8, color: MUTED }),
    text(320, 610, student.numero_etudiant || '', { bold: true, size: 11 }),
    text(74, 582, 'ETUDIANT', { bold: true, size: 8, color: MUTED }),
    text(74, 564, `${student.prenom || ''} ${student.nom || ''}`, { bold: true, size: 12 }),
    text(320, 582, 'FILIERE / NIVEAU', { bold: true, size: 8, color: MUTED }),
    text(320, 564, `${dossier.filiere || ''} - ${dossier.niveau || ''}`, { bold: true, size: 11 }),
    text(56, 505, 'Le service de la scolarite atteste que le dossier susmentionne a ete', { size: 11 }),
    text(56, 486, 'valide pour l annee universitaire en cours.', { size: 11 }),
    text(56, 450, reference, { bold: true, size: 9, color: MUTED }),
    text(56, 430, `Delivree le ${date}`, { size: 10, color: MUTED }),
    `${MUTED} RG 0.8 w 56 210 m 276 210 l S`,
    text(56, 194, 'Le responsable de la scolarite', { bold: true, size: 9 }),
    text(56, 178, 'Universite du Saloum', { size: 9, color: MUTED }),
    `${NAVY} rg 0 0 595 46 re f`,
    text(56, 20, `Scolarite v${version} - VM ${vmName}`, { size: 8, color: WHITE }),
    text(390, 20, 'Document officiel', { bold: true, size: 8, color: WHITE })
  ];

  const stream = commands.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
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

module.exports = { buildAttestation };
