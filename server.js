const path = require('node:path');
const fs = require('node:fs/promises');
const express = require('express');
const session = require('express-session');
const config = require('./src/config');
const { pool } = require('./src/db');
const { FILIERES, NIVEAUX, TYPES_PIECES } = require('./src/referentials');

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V21H3z"/><path d="M9 21v-7h6v7"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  upload: '<path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 16 4-5 3 3 5-7"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  download: '<path d="M12 4v12m0 0 5-5m-5 5-5-5"/><path d="M4 20h16"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  arrow: '<path d="M9 18 15 12 9 6"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  school: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="M5 10v6c0 2 3 4 7 4s7-2 7-4v-6"/>'
};

function icon(name, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.file}</svg>`;
}

function buildNav(role) {
  if (role === 'etudiant') {
    return [
      {
        label: 'MON ESPACE',
        tone: 'navy',
        items: [
          { label: 'Tableau de bord', href: '/etudiant', icon: 'home', exact: true },
          { label: 'Nouvelle demande', href: '/etudiant/dossier/nouveau', icon: 'plus' }
        ]
      },
      {
        label: 'SCOLARITÉ',
        tone: 'yellow',
        items: [
          { label: 'Mes dossiers', href: '/etudiant/dossiers', icon: 'folder', match: ['/etudiant/dossier/'] },
          { label: 'Mes pièces', href: '/etudiant/pieces', icon: 'file', match: ['/etudiant/piece/'] },
          { label: 'Attestations', href: '/etudiant/attestations', icon: 'check' }
        ]
      }
    ];
  }

  if (role === 'admin') {
    return [
      {
        label: 'ADMINISTRATION',
        tone: 'navy',
        items: [
          { label: 'Statistiques', href: '/admin/statistiques', icon: 'chart' },
          { label: 'Comptes agents', href: '/admin/agents', icon: 'users' }
        ]
      },
      {
        label: 'SCOLARITÉ',
        tone: 'yellow',
        items: [
          { label: 'Vue globale', href: '/admin/statistiques', icon: 'grid' },
          { label: 'Dossiers', href: '/agent/dossiers', icon: 'folder' }
        ]
      }
    ];
  }

  return [
    {
      label: 'MON ESPACE',
      tone: 'navy',
      items: [
        { label: 'Dossiers', href: '/agent/dossiers', icon: 'folder' },
        { label: 'Recherche', href: '/agent/dossiers', icon: 'search' }
      ]
    },
    {
      label: 'SCOLARITÉ',
      tone: 'yellow',
      items: [
        { label: 'En attente', href: '/agent/dossiers?etat=en%20attente', icon: 'calendar' },
        { label: 'Validés', href: '/agent/dossiers?etat=valid%C3%A9', icon: 'check' },
        { label: 'Rejetés', href: '/agent/dossiers?etat=rejet%C3%A9', icon: 'close' }
      ]
    }
  ];
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  return value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(value / 1024))} Ko`;
}

function stateClass(state) {
  if (state === 'validé') return 'success';
  if (state === 'rejeté') return 'danger';
  return 'pending';
}

function isActiveNav(req, item) {
  const pathname = req.originalUrl.split('?')[0];
  if (item.exact) return pathname === item.href;
  if (item.href.includes('?')) return req.originalUrl === item.href;
  if (pathname === item.href) return true;
  return (item.match || []).some((prefix) => pathname.startsWith(prefix));
}

async function main() {
  await fs.mkdir(config.uploadDir, { recursive: true });

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.urlencoded({ extended: false }));
  app.use(session({
    name: 'scolarite.sid',
    secret: config.sessionSecret,
    store: new session.MemoryStore(),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: 'auto', maxAge: config.sessionMaxAge }
  }));

  app.use((req, res, next) => {
    const user = req.session.user || null;
    const flashes = req.session.flash || [];
    req.session.flash = [];
    res.locals.user = user;
    res.locals.flash = flashes;
    res.locals.year = config.year;
    res.locals.environment = config.env;
    res.locals.vmName = config.vmName;
    res.locals.appVersion = config.version;
    res.locals.filieres = FILIERES;
    res.locals.niveaux = NIVEAUX;
    res.locals.typesPieces = TYPES_PIECES;
    res.locals.icon = icon;
    res.locals.formatDate = formatDate;
    res.locals.formatBytes = formatBytes;
    res.locals.stateClass = stateClass;
    res.locals.path = req.path;
    res.locals.nav = user ? buildNav(user.role).map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        active: isActiveNav(req, item)
      }))
    })) : [];
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  app.use(require('./src/routes/supervision'));
  app.use(require('./src/routes/auth'));

  const { requireAuth, requireRole } = require('./src/middleware');
  app.use('/etudiant', requireAuth, requireRole('etudiant'), require('./src/routes/student'));
  app.use('/agent', requireAuth, requireRole('agent', 'admin'), require('./src/routes/agent'));
  app.use('/admin', requireAuth, requireRole('admin'), require('./src/routes/admin'));

  app.use((req, res) => {
    res.status(404).render('error', { title: 'Page introuvable', code: 404, message: 'La page demandée n’existe pas' });
  });

  app.use((error, req, res, next) => {
    console.error(error);
    if (res.headersSent) return next(error);
    return res.status(500).render('error', { title: 'Erreur', code: 500, message: 'Une erreur est survenue. Réessayez.' });
  });

  app.listen(config.port, () => {
    process.stdout.write(`Scolarite v${config.version} demarree sur http://localhost:${config.port} (VM ${config.vmName})\n`);
  });

  process.on('SIGTERM', async () => {
    await pool.end();
    process.exit(0);
  });
}

main().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
