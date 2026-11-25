# Le Safran | الزعفران

Site web d'un restaurant avec menu, commande en ligne, réservation de table et espace d'administration. Le site est bilingue (arabe / français).

## Fonctionnalités

**Côté client**
- Consultation du menu par catégorie
- Panier et passage de commande
- Réservation de table
- Interface en arabe (RTL) et en français

**Côté administrateur** (`/admin`)
- Connexion sécurisée par session
- Gestion des produits : ajout, modification, suppression
- Gestion des réservations : confirmer ou refuser
- Suivi des commandes : changement de statut

## Technologies

- [Node.js](https://nodejs.org/) et [Express](https://expressjs.com/)
- [SQLite](https://www.sqlite.org/) via `better-sqlite3`
- `express-session` pour les sessions
- `bcryptjs` pour le hachage des mots de passe
- HTML, CSS et JavaScript (sans framework)

## Structure du projet

```
site-01/
├── admin/
│   ├── login.html        # Page de connexion admin
│   └── dashboard.html    # Tableau de bord admin
├── config/
│   └── admin.js          # Création du compte administrateur
├── database/
│   └── db.js             # Connexion SQLite et création des tables
├── index.html            # Site public
├── server.js             # Serveur Express et routes API
├── package.json
└── .gitignore
```

## Installation

**Prérequis** : [Node.js](https://nodejs.org/) (version LTS recommandée).

```bash
git clone https://github.com/haddoucheathmane48/site-01.git
cd site-01
npm install
node server.js
```

Le site est ensuite disponible sur http://localhost:3000 et l'espace admin sur http://localhost:3000/admin/login.html.

Au premier démarrage, la base de données `database/le-safran.db` et ses tables (`products`, `orders`, `bookings`, `admins`) sont créées automatiquement. Un compte administrateur est également créé à partir de `config/admin.js`.

## Configuration

| Variable | Description | Valeur par défaut |
|----------|-------------|-------------------|
| `SESSION_SECRET` | Clé secrète des sessions | valeur de développement (à changer en production) |

Exemple :

```bash
# Linux / macOS / Git Bash
SESSION_SECRET="une-longue-phrase-aleatoire" node server.js

# Windows (PowerShell)
$env:SESSION_SECRET="une-longue-phrase-aleatoire"; node server.js
```

## API

**Publique**

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/products` | Liste des produits |
| POST | `/api/bookings` | Créer une réservation |
| POST | `/api/orders` | Passer une commande |

**Administration** (session requise)

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/admin/login` | Connexion |
| POST | `/api/admin/logout` | Déconnexion |
| GET | `/api/admin/check` | Vérifier la session |
| GET / POST | `/api/admin/products` | Lister / ajouter un produit |
| PUT / DELETE | `/api/admin/products/:id` | Modifier / supprimer un produit |
| GET | `/api/admin/bookings` | Lister les réservations |
| PUT | `/api/admin/bookings/:id/confirm` | Confirmer une réservation |
| PUT | `/api/admin/bookings/:id/reject` | Refuser une réservation |
| GET | `/api/admin/orders` | Lister les commandes |
| PUT | `/api/admin/orders/:id/status` | Changer le statut d'une commande |

## Sécurité avant la mise en ligne

- Changer l'identifiant et le mot de passe administrateur définis dans `config/admin.js`, ou mieux, les lire depuis des variables d'environnement.
- Définir une vraie valeur pour `SESSION_SECRET`.
- Activer `cookie.secure: true` dans `server.js` si le site est servi en HTTPS.
- Ne jamais ajouter la base de données ni un fichier `.env` au dépôt Git (déjà exclus par `.gitignore`).

## Déploiement

Le site utilise un serveur Node.js et une base SQLite : il ne peut pas être hébergé sur GitHub Pages. Il faut un hébergeur capable d'exécuter Node.js (Render, Railway, VPS, etc.) avec un stockage persistant pour le fichier de base de données.

## Licence

ISC
