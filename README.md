# Plateforme Scolarité — Université du Saloum

Application web de gestion scolaire développée pour le module Cloud : inscription des étudiants, suivi des dossiers, dépôt de pièces justificatives, génération d'attestations, supervision et statistiques.

## Objectifs

- Offrir un parcours d'inscription numérique aux étudiants.
- Permettre aux agents d'instruire les dossiers et de rendre une décision.
- Donner à l'administrateur une vue globale et la gestion des comptes agents.
- Exposer des endpoints de supervision (`/health`, `/version`) pour une machine virtuelle ou un load balancer.
- Respecter une identité visuelle navy/jaune inspirée des maquettes fournies.

## Stack technique

- Node.js 20+ / Express 4
- EJS pour les vues serveur
- MySQL 8 recommandé (MariaDB 10.4+ testé en local)
- `express-session` en mémoire
- `multer` pour l'upload de pièces (PDF/JPG, 5 Mo maximum)
- Hachage des mots de passe via `node:crypto` (scrypt)
- Génération d'attestation PDF sans dépendance externe

## Prérequis

- Node.js >= 20 et npm
- Serveur MySQL 8 accessible avec un utilisateur disposant du droit `CREATE DATABASE`
- Variables d'environnement définies dans `.env`

## Installation

```bash
git clone https://github.com/boltn5107-sos/Projet_de_fin_de_Module_Cloud.git
cd Projet_de_fin_de_Module_Cloud
npm install
cp .env.example .env
```

Sous Windows :

```powershell
Copy-Item .env.example .env
```

Renseignez ensuite `.env` (mot de passe base, secret de session, nom de VM, etc.), puis initialisez la base et les données de démonstration :

```bash
npm run setup
npm start
```

`npm run setup` enchaîne `npm run db:init` (création de la base et du schéma depuis `db/schema.sql`) puis `npm run db:seed` (jeu de données initial).

Le serveur écoute par défaut sur `http://localhost:3000`.

## Comptes de démonstration

Le seed crée :

- 500 étudiants : `ETU20250001` à `ETU20250500`
- 3 agents : `agent1`, `agent2`, `admin`
- 300 dossiers et des pièces associées

Mot de passe initial pour tous ces comptes : `Test1234!` (à changer impérativement hors développement).

## Fonctionnalités par rôle

### Étudiant

- Tableau de bord avec statistiques et dernières demandes
- Création d'une demande d'inscription
- Liste filtrable de ses dossiers
- Détail d'un dossier avec suivi des pièces et de l'état
- Dépôt de pièces justificatives depuis un dossier ou depuis la liste globale
- Liste et téléchargement de ses pièces
- Liste et téléchargement des attestations des dossiers validés

### Agent

- Liste et filtre des dossiers
- Instruction d'un dossier : décision `validé` ou `rejeté`
- Consultation et téléchargement des pièces

### Administrateur

- Statistiques globales par état, filière et agent
- Création de comptes agents

### Supervision

- `GET /health` : état JSON de l'application et de la base (`200` ou `503`)
- `GET /version` : page HTML lisible dans le navigateur ; JSON avec `Accept: application/json` ou `?format=json`

## Principales routes

| Méthode | Route | Description |
| --- | --- | --- |
| GET/POST | `/login`, `/register`, `/logout` | Authentification et inscription |
| GET | `/health`, `/version` | Supervision |
| GET | `/etudiant`, `/etudiant/dossiers`, `/etudiant/pieces`, `/etudiant/attestations` | Espace étudiant |
| GET/POST | `/etudiant/dossier/nouveau`, `/etudiant/piece/nouveau` | Nouvelles demandes et dépôts |
| GET/POST | `/agent/dossiers`, `/agent/dossiers/:id/decision` | Instruction des dossiers |
| GET/POST | `/admin/statistiques`, `/admin/agents` | Administration |

## Structure du projet

```text
.
├── db/schema.sql          # Schéma MySQL
├── public/                # CSS et JavaScript
├── src/
│   ├── routes/            # auth, student, agent, admin, supervision
│   ├── config.js          # Variables d'environnement
│   ├── db.js              # Pool MySQL
│   ├── db-init.js         # Initialisation base/schéma
│   ├── seed.js            # Données de démonstration
│   └── security.js        # Hachage et vérification des mots de passe
├── views/                 # Layouts, partials et pages EJS
├── uploads/               # Pièces déposées (non versionnées)
├── server.js              # Point d'entrée Express
└── plateforme.md          # Cahier des charges
```

## Configuration

Toutes les valeurs sensibles sont lues depuis `.env`, jamais versionnées. Les principales variables sont :

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `PORT` | `3000` | Port HTTP |
| `NODE_ENV` | `development` | Environnement |
| `APP_VERSION` | `1.0.0` | Version affichée dans `/version` |
| `VM_NAME` | hostname | Nom de la VM |
| `DB_HOST`, `DB_PORT`, `DB_NAME` | `127.0.0.1`, `3306`, `scolarite` | Connexion MySQL |
| `DB_USER`, `DB_PASSWORD` | `scolarite`, vide | Identifiants MySQL |
| `SESSION_SECRET` | aléatoire en dev | Signature de session |
| `UPLOAD_DIR` | `./uploads` | Dossier des pièces |
| `MAX_UPLOAD_SIZE` | `5242880` | Taille maximale d'un fichier |
| `SEED_PASSWORD` | `Test1234!` | Mot de passe des comptes générés |

## Déploiement

Pour un déploiement sur VM ou AWS :

1. Installer Node.js LTS et MySQL 8.
2. Créer l'utilisateur base et renseigner `.env`.
3. Lancer `npm ci && npm run setup`.
4. Démarrer l'application avec `npm start` derrière un reverse proxy (Nginx/ALB).
5. Utiliser `/health` comme healthcheck et `/version` comme endpoint d'information de release.

> Les sessions sont stockées en mémoire : pour plusieurs instances, prévoir Redis ou un store partagé.

## Références

- `plateforme.md` : cahier des charges fonctionnel et technique
- `Resume_Projet_Cloud_Scolarite.pdf` : rapport de synthèse
- `School-Management-Software-Web-Ui-Design-(Community)/` : captures des maquettes utilisées
