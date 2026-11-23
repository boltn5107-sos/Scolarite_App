CREATE TABLE IF NOT EXISTS etudiants (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  numero_etudiant VARCHAR(30) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(180) NOT NULL,
  filiere VARCHAR(100) NOT NULL,
  niveau VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_etudiants_numero (numero_etudiant),
  UNIQUE KEY uq_etudiants_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agents (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(180) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('agent', 'admin') NOT NULL DEFAULT 'agent',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_agents_username (username),
  UNIQUE KEY uq_agents_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dossiers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  etudiant_id INT UNSIGNED NOT NULL,
  annee VARCHAR(9) NOT NULL,
  filiere VARCHAR(100) NOT NULL,
  niveau VARCHAR(50) NOT NULL,
  etat ENUM('en attente', 'validé', 'rejeté') NOT NULL DEFAULT 'en attente',
  commentaire TEXT NULL,
  agent_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dossiers_etudiant (etudiant_id),
  KEY idx_dossiers_filiere_etat (filiere, etat),
  CONSTRAINT fk_dossiers_etudiant FOREIGN KEY (etudiant_id) REFERENCES etudiants (id) ON DELETE CASCADE,
    CONSTRAINT fk_dossiers_agent FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pieces (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  dossier_id INT UNSIGNED NOT NULL,
  type ENUM('carte_identite', 'releve_notes', 'photo', 'recu_paiement') NOT NULL,
  nom_fichier VARCHAR(255) NOT NULL,
  chemin VARCHAR(500) NOT NULL,
  taille INT UNSIGNED NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pieces_dossier (dossier_id),
  CONSTRAINT fk_pieces_dossier FOREIGN KEY (dossier_id) REFERENCES dossiers (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
