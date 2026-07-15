// Double-submit CSRF check for the cookie-authenticated refresh/logout
// endpoints. Login itself doesn't need this — it consumes a username/
// password the attacker doesn't have, not an ambient cookie's authority,
// so there's nothing for CSRF to exploit there. Refresh/logout act purely
// on the httpOnly refreshToken cookie, which the browser attaches
// automatically — without this check, a third-party page could trigger a
// POST to /auth/refresh or /auth/logout and ride the victim's cookie.
// The csrfToken cookie is deliberately NOT httpOnly (the frontend reads it
// via document.cookie and echoes it back as a header) — a cross-site
// attacker can trigger the cookie to be *sent*, but same-origin policy
// stops it from *reading* the cookie's value to also send as a header.
module.exports = function requireCsrfMatch(req, res, next) {
  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'CSRF token missing or invalid' });
  }
  next();
};
