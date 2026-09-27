// Petit serveur statique local pour vérifier le site généré : node scripts/serve.mjs [dossier] [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const racine = path.resolve(process.argv[2] || 'dist');
const port = Number(process.argv[3] || 4173);
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.yml': 'text/yaml', '.json': 'application/json' };

export function creerServeur(dossier = racine) {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let fichier = path.join(dossier, p);
    if (!fichier.startsWith(dossier)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(fichier) && fs.statSync(fichier).isDirectory()) fichier = path.join(fichier, 'index.html');
    if (!fs.existsSync(fichier)) {
      res.writeHead(404, { 'content-type': TYPES['.html'] });
      res.end(fs.existsSync(path.join(dossier, '404.html')) ? fs.readFileSync(path.join(dossier, '404.html')) : 'Introuvable');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(fichier)] || 'application/octet-stream' });
    fs.createReadStream(fichier).pipe(res);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  creerServeur().listen(port, () => console.log(`Site servi sur http://localhost:${port}/ (${racine})`));
}
