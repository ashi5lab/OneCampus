// firebase-messaging-sw.js needs the classic (non-module) compat build of
// the Firebase SDK, loaded via importScripts(). Loading that from Google's
// CDN (https://www.gstatic.com/firebasejs/...) gets blocked by any
// deployment that serves a strict `script-src 'self'` Content-Security-
// Policy — the CSP that applies to the client's static host isn't part of
// this repo (server/server.js's Helmet CSP is the API server, a different
// origin), so it can't be loosened from here. Vendoring the exact compat
// bundles that ship inside the already-installed `firebase` npm package
// avoids the CDN entirely (same-origin, always allowed) and keeps the SW's
// Firebase version in lockstep with package.json's — this runs on every
// `npm install` via the postinstall script, so there's no separate version
// pin to remember to update.
const fs = require('fs');
const path = require('path');

const FILES = ['firebase-app-compat.js', 'firebase-messaging-compat.js'];
const srcDir = path.join(__dirname, '..', 'node_modules', 'firebase');
const destDir = path.join(__dirname, '..', 'public', 'vendor');

fs.mkdirSync(destDir, { recursive: true });

for (const file of FILES) {
  fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
  console.log(`Copied ${file} -> public/vendor/`);
}
