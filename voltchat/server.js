// VoltChat — serveur HTTP + temps réel (Server-Sent Events), sans dépendance.
// Lancement : node server.js  (PORT et DATA_FILE configurables)
import http from "node:http";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { creerStore, etatInitial, creerLimiteur, REACTIONS, METIERS } from "./lib/store.js";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ICI, "public");
const PORT = Number(process.env.PORT) || 3100;
const DATA_FILE = process.env.DATA_FILE || path.join(ICI, "data", "voltchat.json");
const TAILLE_MAX_CORPS = 16 * 1024;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// ---------- Persistance ----------
async function charger() {
  if (!existsSync(DATA_FILE)) return etatInitial();
  try {
    return JSON.parse(await readFile(DATA_FILE, "utf8"));
  } catch (e) {
    console.error("Sauvegarde illisible, démarrage à vide :", e.message);
    return etatInitial();
  }
}

let minuterieSauvegarde = null;
function planifierSauvegarde() {
  clearTimeout(minuterieSauvegarde);
  minuterieSauvegarde = setTimeout(sauvegarder, 500);
}
async function sauvegarder() {
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(store.etat));
  await rename(tmp, DATA_FILE);
}

const store = creerStore(await charger(), planifierSauvegarde);
const limiteMessages = creerLimiteur(8, 10_000);
const limiteInscriptions = creerLimiteur(5, 60_000);

// ---------- Temps réel ----------
/** @type {Map<string, Set<http.ServerResponse>>} connexions SSE par membre */
const connexions = new Map();

function diffuser(evenement, donnees) {
  const trame = `event: ${evenement}\ndata: ${JSON.stringify(donnees)}\n\n`;
  for (const flux of connexions.values()) for (const res of flux) res.write(trame);
}

function enLigne() {
  return [...connexions.keys()].map((id) => store.public(store.etat.membres[id])).filter(Boolean);
}

setInterval(() => {
  for (const flux of connexions.values()) for (const res of flux) res.write(": ping\n\n");
}, 25_000).unref();

// ---------- Utilitaires HTTP ----------
function json(res, statut, corps) {
  res.writeHead(statut, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(corps));
}

function lireCorps(req) {
  return new Promise((resolve, reject) => {
    let taille = 0;
    const morceaux = [];
    req.on("data", (m) => {
      taille += m.length;
      if (taille > TAILLE_MAX_CORPS) {
        reject(Object.assign(new Error("Requête trop volumineuse."), { statut: 413 }));
        req.destroy();
      } else morceaux.push(m);
    });
    req.on("end", () => {
      try {
        resolve(morceaux.length ? JSON.parse(Buffer.concat(morceaux).toString("utf8")) : {});
      } catch {
        reject(Object.assign(new Error("JSON invalide."), { statut: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function authentifier(req, url) {
  const entete = req.headers.authorization ?? "";
  const jeton = entete.startsWith("Bearer ") ? entete.slice(7) : url.searchParams.get("jeton");
  return store.membre(jeton);
}

async function servirFichier(res, chemin) {
  const cible = path.normalize(path.join(PUBLIC, chemin === "/" ? "index.html" : chemin));
  if (!cible.startsWith(PUBLIC + path.sep)) return json(res, 403, { erreur: "Interdit." });
  try {
    const contenu = await readFile(cible);
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(cible)] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:",
    });
    res.end(contenu);
  } catch {
    json(res, 404, { erreur: "Introuvable." });
  }
}

// ---------- Routes ----------
async function router(req, res) {
  const url = new URL(req.url, "http://localhost");
  const p = url.pathname;
  const ip = req.socket.remoteAddress ?? "?";

  if (!p.startsWith("/api/")) {
    if (req.method !== "GET") return json(res, 405, { erreur: "Méthode non autorisée." });
    return servirFichier(res, p);
  }

  if (req.method === "GET" && p === "/api/config") {
    return json(res, 200, { metiers: METIERS, reactions: REACTIONS });
  }

  if (req.method === "POST" && p === "/api/inscription") {
    if (!limiteInscriptions(ip)) return json(res, 429, { erreur: "Trop d'inscriptions, réessayez dans une minute." });
    const r = store.inscrire(await lireCorps(req));
    if (!r.ok) return json(res, 400, { erreur: r.erreur });
    return json(res, 201, { jeton: r.membre.jeton, membre: store.public(r.membre) });
  }

  const membre = authentifier(req, url);
  if (!membre) return json(res, 401, { erreur: "Session inconnue, reconnectez-vous." });

  if (req.method === "GET" && p === "/api/moi") return json(res, 200, { membre: store.public(membre) });

  if (req.method === "GET" && p === "/api/salons") return json(res, 200, { salons: store.salons() });

  if (req.method === "GET" && p === "/api/flux") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write("retry: 3000\n\n");
    const etaitHorsLigne = !connexions.has(membre.id);
    if (etaitHorsLigne) connexions.set(membre.id, new Set());
    connexions.get(membre.id).add(res);
    if (etaitHorsLigne) diffuser("presence", { enLigne: enLigne() });
    else res.write(`event: presence\ndata: ${JSON.stringify({ enLigne: enLigne() })}\n\n`);
    req.on("close", () => {
      const flux = connexions.get(membre.id);
      flux?.delete(res);
      if (flux && flux.size === 0) {
        connexions.delete(membre.id);
        diffuser("presence", { enLigne: enLigne() });
      }
    });
    return;
  }

  let m = p.match(/^\/api\/salons\/([\w-]+)\/messages$/);
  if (m && req.method === "GET") {
    const r = store.messages(m[1], { avant: url.searchParams.get("avant") ?? undefined });
    return r ? json(res, 200, r) : json(res, 404, { erreur: "Salon introuvable." });
  }
  if (m && req.method === "POST") {
    if (!limiteMessages(membre.id)) return json(res, 429, { erreur: "Doucement ! Attendez quelques secondes." });
    const { texte } = await lireCorps(req);
    const r = store.publier(membre, m[1], texte);
    if (!r.ok) return json(res, 400, { erreur: r.erreur });
    diffuser("message", r.message);
    return json(res, 201, { message: r.message });
  }

  m = p.match(/^\/api\/salons\/([\w-]+)\/messages\/([\w-]+)\/reactions$/);
  if (m && req.method === "POST") {
    const { emoji } = await lireCorps(req);
    const r = store.reagir(membre, m[1], m[2], emoji);
    if (!r.ok) return json(res, 400, { erreur: r.erreur });
    diffuser("reaction", { salon: m[1], id: m[2], reactions: r.message.reactions });
    return json(res, 200, { reactions: r.message.reactions });
  }

  m = p.match(/^\/api\/salons\/([\w-]+)\/ecrit$/);
  if (m && req.method === "POST") {
    diffuser("ecrit", { salon: m[1], membre: store.public(membre) });
    res.writeHead(204).end();
    return;
  }

  json(res, 404, { erreur: "Route inconnue." });
}

const serveur = http.createServer((req, res) => {
  router(req, res).catch((e) => {
    if (!res.headersSent) json(res, e.statut ?? 500, { erreur: e.statut ? e.message : "Erreur serveur." });
    if (!e.statut) console.error(e);
  });
});

serveur.listen(PORT, () => console.log(`⚡ VoltChat prêt sur http://localhost:${PORT}`));

async function arreter() {
  clearTimeout(minuterieSauvegarde);
  await sauvegarder().catch((e) => console.error(e));
  process.exit(0);
}
process.on("SIGINT", arreter);
process.on("SIGTERM", arreter);
