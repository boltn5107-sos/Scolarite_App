const FILIERES = [
  'Informatique',
  'Gestion',
  'Droit',
  'Lettres',
  'Sciences',
  'Santé'
];

const NIVEAUX = ['L1', 'L2', 'L3', 'M1', 'M2'];

const TYPES_PIECES = {
  carte_identite: "Copie de la carte d'identité",
  releve_notes: 'Relevé de notes',
  photo: 'Photo d’identité',
  recu_paiement: 'Reçu de paiement'
};

const ETATS = ['en attente', 'validé', 'rejeté'];

module.exports = { FILIERES, NIVEAUX, TYPES_PIECES, ETATS };
