const { toAscii } = require('./security');

function pdfEscape(value) {
  return toAscii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildAttestation({ student, dossier, version, vmName, date }) {
  const lines = [
    { size: 11, x: 72, y: 770, text: 'UNIVERSITE DU SALOUM' },
    { size: 9, x: 72, y: 752, text: 'SERVICE DE LA SCOLARITE' },
    { size: 18, x: 72, y: 700, text: 'ATTESTATION D INSCRIPTION' },
    { size: 11, x: 72, y: 660, text: `Anne universitaire : ${dossier.annee}` },
    { size: 11, x: 72, y: 638, text: `Numero etudiant : ${student.numero_etudiant}` },
    { size: 11, x: 72, y: 616, text: `Nom et prenoms : ${student.nom} ${student.prenom}` },
    { size: 11, x: 72, y: 594, text: `Filiere : ${dossier.filiere}` },
    { size: 11, x: 72, y: 572, text: `Niveau : ${dossier.niveau}` },
    { size: 11, x: 72, y: 528, text: 'Le service de la scolarite atteste que le dossier susmentionne' },
    { size: 11, x: 72, y: 510, text: 'a ete valide pour l annee universitaire en cours.' },
    { size: 9, x: 72, y: 440, text: `Delivree le ${date}` },
    { size: 8, x: 72, y: 80, text: `Scolarite v${version} - VM ${vmName}` }
  ];

  const stream = lines
    .map(({ size, x, y, text }) => `BT /F1 ${size} Tf ${x} ${y} Td (${pdfEscape(text)}) Tj ET`)
    .join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
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
