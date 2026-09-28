// VoltChat — serveur HTTP + temps réel (Server-Sent Events), sans dépendance.
// Lancement : node server.js  (PORT, DATA_FILE, VOLTCHAT_CODE_MODERATION configurables)
import http from "node:http";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  creerStore,
  etatInitial,
  creerLimiteur,
  REACTIONS,
  METIERS,
  MOTIFS_SIGNALEMENT,
  DUREE_SESSION,
} from "./lib/store.js";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ICI, "public");
const PORT = Number(process.env.PORT) || 3100;
const DATA_FILE = process.env.DATA_FILE || path.join(ICI, "data", "voltchat.json");
const CODE_MODERATION = process.env.VOLTCHAT_CODE_MODERATION || "";
const TAILLE_MAX_CORPS = 16 * 1024;
const COOKIE = "vc_session";

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
const limiteSignalements = creerLimiteur(5, 60_000);
setInterval(() => {
  for (const l of [limiteMessages, limiteInscriptions, limiteSignalements]) l.nettoyer();
}, 60_000).unref();

// ---------- Temps réel ----------
/** @type {Map<string, Set<http.ServerResponse>>} connexions SSE par membre */
const connexions = new Map();

const trame = (evenement, donnees) => `event: ${evenement}\ndata: ${JSON.stringify(donnees)}\n\n`;

/** Envoie un événement à tous, ou seulement aux membres listés. */
function diffuser(evenement, donnees, destinataires = null) {
  const t = trame(evenement, donnees);
  for (const [id, flux] of connexions) {
    if (destinataires && !destinataires.includes(id)) continue;
    for (const res of flux) res.write(t);
  }
}

/** Diffuse un événement lié à un fil : à tous pour un salon, aux deux participants pour un privé. */
function diffuserFil(evenement, filId, donnees) {
  diffuser(evenement, donnees, store.participants(filId));
}

function moderateursConnectes() {
  return [...connexions.keys()].filter((id) => store.estModerateur(store.etat.membres[id]));
}

function enLigne() {
  return [...connexions.keys()].map((id) => store.public(store.etat.membres[id])).filter(Boolean);
}

function fermerConnexions(membreId, evenement, donnees) {
  const flux = connexions.get(membreId);
  if (!flux) return;
  connexions.delete(membreId);
  for (const res of flux) res.end(trame(evenement, donnees));
  diffuser("presence", { enLigne: enLigne() });
}

setInterval(() => {
  for (const flux of connexions.values()) for (const res of flux) res.write(": ping\n\n");
}, 25_000).unref();

// ---------- Utilitaires HTTP ----------
function json(res, statut, corps, entetes = {}) {
  res.writeHead(statut, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...entetes });
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

function lireCookie(req, nom) {
  for (const partie of (req.headers.cookie ?? "").split(";")) {
    const [cle, ...valeur] = partie.trim().split("=");
    if (cle === nom) return decodeURIComponent(valeur.join("="));
  }
  return undefined;
}

/**
 * Cookie de session limité au flux temps réel : EventSource ne peut pas envoyer
 * d'en-tête Authorization, et le jeton ne doit pas apparaître dans l'URL.
 */
function cookieSession(req, jeton) {
  const https = req.headers["x-forwarded-proto"] === "https" || req.socket.encrypted;
  const age = jeton ? Math.floor(DUREE_SESSION / 1000) : 0;
  return [
    `${COOKIE}=${jeton ? encodeURIComponent(jeton) : ""}`,
    "Path=/api/flux",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${age}`,
    ...(https ? ["Secure"] : []),
  ].join("; ");
}

/** Comparaison en temps constant du code modérateur. */
function codeModerationValide(code) {
  if (!CODE_MODERATION || typeof code !== "string" || !code) return false;
  const h = (s) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(code), h(CODE_MODERATION));
}

function authentifier(req, p) {
  const entete = req.headers.authorization ?? "";
  if (entete.startsWith("Bearer ")) return store.membre(entete.slice(7));
  // Le cookie n'est accepté que pour le flux SSE (GET, sans effet de bord).
  if (p === "/api/flux") return store.membre(lireCookie(req, COOKIE));
  return undefined;
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

const erreur = (res, r) => json(res, r.statut ?? 400, { erreur: r.erreur });

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
    return json(res, 200, {
      metiers: METIERS,
      reactions: REACTIONS,
      motifs: MOTIFS_SIGNALEMENT,
      moderation: Boolean(CODE_MODERATION),
    });
  }

  if (req.method === "POST" && p === "/api/inscription") {
    if (!limiteInscriptions(ip)) return json(res, 429, { erreur: "Trop d'inscriptions, réessayez dans une minute." });
    const corps = await lireCorps(req);
    if (corps.codeModeration && !codeModerationValide(corps.codeModeration)) {
      return json(res, 400, { erreur: "Code modérateur incorrect." });
    }
    const r = store.inscrire(corps, Date.now(), { moderateur: codeModerationValide(corps.codeModeration) });
    if (!r.ok) return erreur(res, r);
    return json(
      res,
      201,
      { jeton: r.membre.jeton, membre: store.public(r.membre) },
      { "Set-Cookie": cookieSession(req, r.membre.jeton) },
    );
  }

  const membre = authentifier(req, p);
  if (!membre) {
    return json(res, 401, { erreur: "Session expirée, reconnectez-vous." }, { "Set-Cookie": cookieSession(req, null) });
  }

  if (req.method === "GET" && p === "/api/moi") {
    store.prolonger(membre);
    return json(res, 200, { membre: store.public(membre) }, { "Set-Cookie": cookieSession(req, membre.jeton) });
  }

  if (req.method === "POST" && p === "/api/deconnexion") {
    store.deconnecter(membre);
    fermerConnexions(membre.id, "fin", {});
    return json(res, 200, { ok: true }, { "Set-Cookie": cookieSession(req, null) });
  }

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
    else res.write(trame("presence", { enLigne: enLigne() }));
    req.on("close", () => {
      const flux = connexions.get(membre.id);
      if (!flux?.delete(res)) return;
      if (flux.size === 0) {
        connexions.delete(membre.id);
        diffuser("presence", { enLigne: enLigne() });
      }
    });
    return;
  }

  // ----- Conversations privées -----
  if (p === "/api/conversations" && req.method === "GET") {
    return json(res, 200, { conversations: store.conversationsDe(membre) });
  }
  if (p === "/api/conversations" && req.method === "POST") {
    const { avec } = await lireCorps(req);
    const r = store.conversation(membre, avec);
    if (!r.ok) return erreur(res, r);
    const resume = store.conversationsDe(membre).find((c) => c.id === r.conversation.id);
    if (r.cree) {
      const autre = store.etat.membres[avec];
      diffuser("conversation", store.conversationsDe(autre).find((c) => c.id === r.conversation.id), [autre.id]);
    }
    return json(res, r.cree ? 201 : 200, { conversation: resume });
  }

  // ----- Modération -----
  if (p === "/api/signalements" || p.startsWith("/api/signalements/") || p.startsWith("/api/membres/")) {
    if (!store.estModerateur(membre)) return json(res, 403, { erreur: "Action réservée aux modérateurs." });
  }
  if (p === "/api/signalements" && req.method === "GET") {
    return json(res, 200, { signalements: store.signalements() });
  }
  let m = p.match(/^\/api\/signalements\/([\w-]+)$/);
  if (m && req.method === "DELETE") {
    const r = store.ignorerSignalement(m[1]);
    if (!r.ok) return erreur(res, r);
    diffuser("signalements", { total: store.signalements().length }, moderateursConnectes());
    return json(res, 200, { ok: true });
  }
  m = p.match(/^\/api\/membres\/([\w-]+)\/exclusion$/);
  if (m && req.method === "POST") {
    const r = store.exclure(membre, m[1]);
    if (!r.ok) return erreur(res, r);
    fermerConnexions(r.membre.id, "exclu", {});
    for (const msg of r.retires) diffuser("suppression", { salon: msg.salon, id: msg.id });
    diffuser("signalements", { total: store.signalements().length }, moderateursConnectes());
    return json(res, 200, { retires: r.retires.length });
  }

  // ----- Fils : salons publics et conversations privées -----
  m = p.match(/^\/api\/salons\/([\w-]+)(\/.*)?$/);
  if (!m) return json(res, 404, { erreur: "Route inconnue." });
  const [, fil, suite = ""] = m;
  if (!store.peutAcceder(membre, fil)) return json(res, 404, { erreur: "Salon introuvable." });

  if (suite === "/messages" && req.method === "GET") {
    return json(res, 200, store.messages(fil, { avant: url.searchParams.get("avant") ?? undefined }));
  }
  if (suite === "/messages" && req.method === "POST") {
    if (!limiteMessages(membre.id)) return json(res, 429, { erreur: "Doucement ! Attendez quelques secondes." });
    const { texte } = await lireCorps(req);
    const r = store.publier(membre, fil, texte);
    if (!r.ok) return erreur(res, r);
    diffuserFil("message", fil, r.message);
    return json(res, 201, { message: r.message });
  }
  if (suite === "/ecrit" && req.method === "POST") {
    const destinataires = store.participants(fil)?.filter((id) => id !== membre.id) ?? null;
    diffuser("ecrit", { salon: fil, membre: store.public(membre) }, destinataires);
    res.writeHead(204).end();
    return;
  }

  m = suite.match(/^\/messages\/([\w-]+)(\/reactions|\/signalements)?$/);
  if (!m) return json(res, 404, { erreur: "Route inconnue." });
  const [, messageId, action = ""] = m;

  if (!action && req.method === "PATCH") {
    if (!limiteMessages(membre.id)) return json(res, 429, { erreur: "Doucement ! Attendez quelques secondes." });
    const { texte } = await lireCorps(req);
    const r = store.modifier(membre, fil, messageId, texte);
    if (!r.ok) return erreur(res, r);
    diffuserFil("modification", fil, r.message);
    return json(res, 200, { message: r.message });
  }
  if (!action && req.method === "DELETE") {
    const r = store.supprimer(membre, fil, messageId);
    if (!r.ok) return erreur(res, r);
    diffuserFil("suppression", fil, { salon: fil, id: messageId });
    diffuser("signalements", { total: store.signalements().length }, moderateursConnectes());
    return json(res, 200, { ok: true });
  }
  if (action === "/reactions" && req.method === "POST") {
    const { emoji } = await lireCorps(req);
    const r = store.reagir(membre, fil, messageId, emoji);
    if (!r.ok) return erreur(res, r);
    diffuserFil("reaction", fil, { salon: fil, id: messageId, reactions: r.message.reactions });
    return json(res, 200, { reactions: r.message.reactions });
  }
  if (action === "/signalements" && req.method === "POST") {
    if (!limiteSignalements(membre.id)) return json(res, 429, { erreur: "Trop de signalements, réessayez plus tard." });
    const { motif } = await lireCorps(req);
    const r = store.signaler(membre, fil, messageId, motif);
    if (!r.ok) return erreur(res, r);
    if (r.nouveau) diffuser("signalements", { total: store.signalements().length }, moderateursConnectes());
    return json(res, 201, { ok: true });
  }

  json(res, 404, { erreur: "Route inconnue." });
}

const serveur = http.createServer((req, res) => {
  router(req, res).catch((e) => {
    if (!res.headersSent) json(res, e.statut ?? 500, { erreur: e.statut ? e.message : "Erreur serveur." });
    if (!e.statut) console.error(e);
  });
});

serveur.listen(PORT, () => {
  console.log(`⚡ VoltChat prêt sur http://localhost:${PORT}`);
  if (!CODE_MODERATION) console.log("   (aucun code modérateur défini : VOLTCHAT_CODE_MODERATION)");
});

async function arreter() {
  clearTimeout(minuterieSauvegarde);
  await sauvegarder().catch((e) => console.error(e));
  process.exit(0);
}
process.on("SIGINT", arreter);
process.on("SIGTERM", arreter);
