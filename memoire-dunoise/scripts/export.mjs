// Sauvegarde : exporte tous les contenus (brouillons compris) dans un fichier JSON daté,
// et copie le dossier content/ complet (textes et images d'origine) à côté.
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { CONTENT_DIR } from './lib/content.mjs';

const date = new Date().toISOString().slice(0, 10);
const dest = path.resolve(import.meta.dirname, '../export', `sauvegarde-${date}`);
fs.mkdirSync(dest, { recursive: true });

const donnees = { exporte_le: new Date().toISOString(), site: JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'site.json'), 'utf8')) };
for (const dossier of ['pages', 'articles', 'documents', 'combattants', 'evenements', 'actualites']) {
  const d = path.join(CONTENT_DIR, dossier);
  donnees[dossier] = fs.existsSync(d)
    ? fs.readdirSync(d).filter((f) => f.endsWith('.md')).map((f) => {
        const { data, content } = matter(fs.readFileSync(path.join(d, f), 'utf8'));
        return { fichier: `${dossier}/${f}`, ...data, texte: content.trim() };
      })
    : [];
}
fs.writeFileSync(path.join(dest, 'contenus.json'), JSON.stringify(donnees, null, 2));
fs.cpSync(CONTENT_DIR, path.join(dest, 'content'), { recursive: true });
console.log(`Sauvegarde écrite dans ${path.relative(process.cwd(), dest)}/ (contenus.json + dossier content/)`);
