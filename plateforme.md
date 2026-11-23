# 3. L'application Scolarité

## Fonctionnalités

### Étudiant

-   Crée son compte.
-   Remplit sa demande d'inscription.
-   Dépose ses pièces (PDF/JPG, 5 Mo max).
-   Suit son dossier.
-   Télécharge son attestation.

### Agent

-   Liste les dossiers par filière et état.
-   Ouvre les pièces.
-   Valide ou rejette avec commentaire.

### Administrateur

-   Crée les comptes des agents.
-   Consulte des statistiques simples.

## États d'un dossier

-   En attente.
-   Validé.
-   Rejeté.

## Technique imposée

-   Node.js LTS + Express + EJS.
-   MySQL 8 (tables `etudiants`, `agents`, `dossiers`, `pieces`).
-   Sessions en mémoire (volontaire).
-   Configuration par variables d'environnement.

## Supervision

-   Route `/health` : 200 si la base répond.
-   Route `/version` : version et nom de la VM.

## Script de données

-   500 étudiants fictifs.
-   3 agents.
