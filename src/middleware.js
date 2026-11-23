function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  return next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    if (!roles.includes(req.session.user.role)) return res.redirect('/acces-refuse');
    return next();
  };
}

function setFlash(req, type, message) {
  req.session.flash = [...(req.session.flash || []), { type, message }];
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

module.exports = { requireAuth, requireRole, setFlash, asyncRoute };
