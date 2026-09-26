// VoltChat — client web (aucun framework).
const $ = (sel) => document.querySelector(sel);
const CLE_JETON = "voltchat.jeton";

const etat = {
  jeton: lireJeton(),
  moi: null,
  config: { metiers: [], reactions: [] },
  salons: [],
  salonActif: null,
  messages: new Map(), // salonId -> tableau de messages chargés
  plusAnciens: new Map(), // salonId -> booléen
  nonLus: new Map(),
  enLigne: [],
  ecrivent: new Map(), // membreId -> { nom, salon, expire }
  flux: null,
};

// ---------- Stockage local (peut échouer en navigation privée) ----------
function lireJeton() {
  try { return localStorage.getItem(CLE_JETON); } catch { return null; }
}
function ecrireJeton(valeur) {
  try {
    if (valeur) localStorage.setItem(CLE_JETON, valeur);
    else localStorage.removeItem(CLE_JETON);
  } catch { /* sans persistance : la session durera le temps de l'onglet */ }
}

// ---------- API ----------
async function api(chemin, { methode = "GET", corps } = {}) {
  const res = await fetch(chemin, {
    method: methode,
    headers: {
      ...(corps ? { "Content-Type": "application/json" } : {}),
      ...(etat.jeton ? { Authorization: `Bearer ${etat.jeton}` } : {}),
    },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  if (res.status === 204) return null;
  const donnees = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(donnees.erreur || "Erreur réseau."), { statut: res.status });
  return donnees;
}

// ---------- Utilitaires d'affichage ----------
const PALETTE = ["#3DF5A7", "#4CC9F0", "#F7B801", "#F15BB5", "#9B5DE5", "#FF7F50", "#00BBF9", "#80ED99"];
function couleur(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
function initiales(nom) {
  return nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0].toUpperCase()).join("");
}
const fmtHeure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const fmtJour = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
function libelleJour(date) {
  const d = new Date(date);
  const auj = new Date();
  const hier = new Date(auj);
  hier.setDate(auj.getDate() - 1);
  if (d.toDateString() === auj.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === hier.toDateString()) return "Hier";
  return fmtJour.format(d);
}

/** Remplit `el` avec le texte, en transformant les URL http(s) en liens — sans innerHTML. */
function texteAvecLiens(el, texte) {
  const re = /https?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]]/g;
  let dernier = 0;
  for (const m of texte.matchAll(re)) {
    el.append(texte.slice(dernier, m.index));
    const a = document.createElement("a");
    a.href = m[0];
    a.textContent = m[0];
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    el.append(a);
    dernier = m.index + m[0].length;
  }
  el.append(texte.slice(dernier));
}

let minuterieNotif;
function notifier(texte) {
  const n = $("#notification");
  n.textContent = texte;
  n.hidden = false;
  clearTimeout(minuterieNotif);
  minuterieNotif = setTimeout(() => (n.hidden = true), 3500);
}

// ---------- Accueil ----------
function afficherAccueil() {
  $("#app").hidden = true;
  $("#accueil").hidden = false;
  const select = $("#form-inscription select[name=metier]");
  select.replaceChildren(new Option("Choisissez votre métier…", ""));
  for (const m of etat.config.metiers) select.append(new Option(m, m));
  $("#form-inscription input[name=nom]").focus();
}

$("#form-inscription").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  const bouton = e.currentTarget.querySelector("button");
  bouton.disabled = true;
  $("#erreur-inscription").textContent = "";
  try {
    const r = await api("/api/inscription", {
      methode: "POST",
      corps: { nom: f.get("nom"), metier: f.get("metier"), entreprise: f.get("entreprise") },
    });
    etat.jeton = r.jeton;
    ecrireJeton(r.jeton);
    etat.moi = r.membre;
    await demarrerApp();
  } catch (err) {
    $("#erreur-inscription").textContent = err.message;
  } finally {
    bouton.disabled = false;
  }
});

// ---------- Salons ----------
function rendreSalons() {
  const nav = $("#liste-salons");
  nav.replaceChildren();
  for (const s of etat.salons) {
    const a = document.createElement("a");
    a.href = `#${s.id}`;
    a.className = "salon" + (s.id === etat.salonActif ? " actif" : "");
    a.title = s.description;
    const icone = document.createElement("span");
    icone.className = "salon-icone";
    icone.textContent = s.icone;
    const nom = document.createElement("span");
    nom.className = "salon-nom";
    nom.textContent = s.nom;
    a.append(icone, nom);
    const n = etat.nonLus.get(s.id);
    if (n) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = n > 99 ? "99+" : String(n);
      a.append(badge);
    }
    nav.append(a);
  }
}

async function ouvrirSalon(id) {
  const salon = etat.salons.find((s) => s.id === id) ?? etat.salons[0];
  if (!salon) return;
  etat.salonActif = salon.id;
  etat.nonLus.delete(salon.id);
  $("#titre-salon").textContent = `${salon.icone} ${salon.nom}`;
  $("#description-salon").textContent = salon.description;
  $("#champ-message").placeholder = `Écrire dans « ${salon.nom} »…`;
  document.title = `${salon.nom} · VoltChat`;
  rendreSalons();
  fermerPanneaux();
  if (!etat.messages.has(salon.id)) {
    $("#messages").replaceChildren();
    try {
      const r = await api(`/api/salons/${salon.id}/messages`);
      etat.messages.set(salon.id, r.messages);
      etat.plusAnciens.set(salon.id, r.plusAnciens);
    } catch (err) {
      return notifier(err.message);
    }
  }
  if (etat.salonActif !== salon.id) return; // l'utilisateur a changé de salon entre-temps
  rendreMessages({ versLeBas: true });
  rendreEcrit();
  $("#champ-message").focus({ preventScroll: true });
}

$("#plus-anciens").addEventListener("click", async () => {
  const id = etat.salonActif;
  const liste = etat.messages.get(id);
  const fil = $("#fil");
  const hauteurAvant = fil.scrollHeight;
  try {
    const r = await api(`/api/salons/${id}/messages?avant=${encodeURIComponent(liste[0].id)}`);
    etat.messages.set(id, [...r.messages, ...liste]);
    etat.plusAnciens.set(id, r.plusAnciens);
    rendreMessages();
    fil.scrollTop = fil.scrollHeight - hauteurAvant;
  } catch (err) {
    notifier(err.message);
  }
});

// ---------- Messages ----------
function rendreMessages({ versLeBas = false } = {}) {
  const liste = etat.messages.get(etat.salonActif) ?? [];
  const conteneur = $("#messages");
  const fragment = document.createDocumentFragment();
  let precedent = null;
  if (!liste.length) {
    const vide = document.createElement("p");
    vide.className = "vide";
    vide.textContent = "Aucun message pour l'instant. Lancez la discussion !";
    fragment.append(vide);
  }
  for (const m of liste) {
    const jour = libelleJour(m.date);
    if (!precedent || libelleJour(precedent.date) !== jour) {
      const sep = document.createElement("div");
      sep.className = "separateur";
      sep.textContent = jour;
      fragment.append(sep);
      precedent = null;
    }
    const suite = precedent && precedent.auteur.id === m.auteur.id && m.date - precedent.date < 5 * 60_000;
    fragment.append(elementMessage(m, suite));
    precedent = m;
  }
  conteneur.replaceChildren(fragment);
  $("#plus-anciens").hidden = !etat.plusAnciens.get(etat.salonActif);
  if (versLeBas) $("#fil").scrollTop = $("#fil").scrollHeight;
}

function elementMessage(m, suite) {
  const el = $("#modele-message").content.firstElementChild.cloneNode(true);
  el.dataset.id = m.id;
  if (suite) el.classList.add("suite");
  if (m.auteur.id === etat.moi?.id) el.classList.add("moi");
  if (m.auteur.id === "systeme") el.classList.add("systeme");
  const avatar = el.querySelector(".avatar");
  avatar.textContent = m.auteur.id === "systeme" ? "⚡" : initiales(m.auteur.nom);
  avatar.style.setProperty("--c", couleur(m.auteur.id));
  el.querySelector(".auteur").textContent = m.auteur.nom;
  el.querySelector(".role").textContent = [m.auteur.metier, m.auteur.entreprise].filter(Boolean).join(" · ");
  const t = el.querySelector("time");
  t.dateTime = new Date(m.date).toISOString();
  t.textContent = fmtHeure.format(m.date);
  texteAvecLiens(el.querySelector(".texte"), m.texte);
  rendreReactions(el.querySelector(".reactions"), m);
  // Sur écran tactile (pas de survol), un appui affiche la palette de réactions.
  el.addEventListener("click", (e) => {
    if (e.target.closest("a, button")) return;
    const deja = el.classList.contains("selectionne");
    document.querySelectorAll(".message.selectionne").forEach((x) => x.classList.remove("selectionne"));
    if (!deja) el.classList.add("selectionne");
  });
  return el;
}

function rendreReactions(zone, m) {
  zone.replaceChildren();
  for (const [emoji, qui] of Object.entries(m.reactions)) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "reaction" + (qui.includes(etat.moi?.id) ? " mienne" : "");
    b.textContent = `${emoji} ${qui.length}`;
    b.setAttribute("aria-label", `${emoji}, ${qui.length} réaction${qui.length > 1 ? "s" : ""}`);
    b.addEventListener("click", () => reagir(m, emoji));
    zone.append(b);
  }
  const ajout = document.createElement("div");
  ajout.className = "ajout-reaction";
  for (const emoji of etat.config.reactions) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = emoji;
    b.setAttribute("aria-label", `Réagir avec ${emoji}`);
    b.addEventListener("click", () => reagir(m, emoji));
    ajout.append(b);
  }
  zone.append(ajout);
}

async function reagir(m, emoji) {
  try {
    const r = await api(`/api/salons/${m.salon}/messages/${m.id}/reactions`, { methode: "POST", corps: { emoji } });
    appliquerReactions(m.salon, m.id, r.reactions);
  } catch (err) {
    notifier(err.message);
  }
}

function appliquerReactions(salon, id, reactions) {
  const m = etat.messages.get(salon)?.find((x) => x.id === id);
  if (!m) return;
  m.reactions = reactions;
  if (salon !== etat.salonActif) return;
  const zone = document.querySelector(`.message[data-id="${CSS.escape(id)}"] .reactions`);
  if (zone) rendreReactions(zone, m);
}

function recevoirMessage(m) {
  const liste = etat.messages.get(m.salon);
  if (liste && !liste.some((x) => x.id === m.id)) liste.push(m);
  etat.ecrivent.delete(m.auteur.id);
  const salon = etat.salons.find((s) => s.id === m.salon);
  if (salon) salon.total += 1;
  if (m.salon === etat.salonActif) {
    const fil = $("#fil");
    const enBas = fil.scrollHeight - fil.scrollTop - fil.clientHeight < 120;
    rendreMessages({ versLeBas: enBas || m.auteur.id === etat.moi.id });
    rendreEcrit();
    if (document.hidden && m.auteur.id !== etat.moi.id) signalerOnglet();
  } else if (m.auteur.id !== etat.moi.id) {
    etat.nonLus.set(m.salon, (etat.nonLus.get(m.salon) ?? 0) + 1);
    rendreSalons();
  }
}

let nonVusOnglet = 0;
function signalerOnglet() {
  nonVusOnglet += 1;
  const salon = etat.salons.find((s) => s.id === etat.salonActif);
  document.title = `(${nonVusOnglet}) ${salon?.nom ?? ""} · VoltChat`;
}
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && nonVusOnglet) {
    nonVusOnglet = 0;
    const salon = etat.salons.find((s) => s.id === etat.salonActif);
    document.title = `${salon?.nom ?? ""} · VoltChat`;
  }
});

// ---------- Saisie ----------
const champ = $("#champ-message");
let dernierSignalEcrit = 0;

champ.addEventListener("input", () => {
  champ.style.height = "auto";
  champ.style.height = `${Math.min(champ.scrollHeight, 180)}px`;
  if (Date.now() - dernierSignalEcrit > 2500 && champ.value.trim()) {
    dernierSignalEcrit = Date.now();
    api(`/api/salons/${etat.salonActif}/ecrit`, { methode: "POST" }).catch(() => {});
  }
});
champ.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    $("#form-message").requestSubmit();
  }
});

$("#form-message").addEventListener("submit", async (e) => {
  e.preventDefault();
  const texte = champ.value.trim();
  if (!texte) return;
  const bouton = e.currentTarget.querySelector("button");
  bouton.disabled = true;
  try {
    const r = await api(`/api/salons/${etat.salonActif}/messages`, { methode: "POST", corps: { texte } });
    champ.value = "";
    champ.style.height = "auto";
    dernierSignalEcrit = 0;
    recevoirMessage(r.message); // le flux SSE le renverra aussi : doublon ignoré
  } catch (err) {
    notifier(err.message);
  } finally {
    bouton.disabled = false;
    champ.focus();
  }
});

// ---------- Présence & « est en train d'écrire » ----------
function rendreMembres() {
  $("#compteur-en-ligne").textContent = String(etat.enLigne.length);
  const ul = $("#liste-membres");
  ul.replaceChildren();
  const tries = [...etat.enLigne].sort((a, b) => (a.id === etat.moi.id ? -1 : b.id === etat.moi.id ? 1 : a.nom.localeCompare(b.nom, "fr")));
  for (const m of tries) {
    const li = document.createElement("li");
    const av = document.createElement("span");
    av.className = "avatar petit";
    av.style.setProperty("--c", couleur(m.id));
    av.textContent = initiales(m.nom);
    const info = document.createElement("div");
    const nom = document.createElement("strong");
    nom.textContent = m.nom + (m.id === etat.moi.id ? " (vous)" : "");
    const role = document.createElement("span");
    role.textContent = [m.metier, m.entreprise].filter(Boolean).join(" · ");
    info.append(nom, role);
    li.append(av, info);
    ul.append(li);
  }
}

function rendreEcrit() {
  const maintenant = Date.now();
  const noms = [...etat.ecrivent.values()]
    .filter((x) => x.salon === etat.salonActif && x.expire > maintenant)
    .map((x) => x.nom);
  const el = $("#indicateur-ecrit");
  if (!noms.length) el.textContent = "";
  else if (noms.length === 1) el.textContent = `${noms[0]} est en train d'écrire…`;
  else if (noms.length <= 3) el.textContent = `${noms.join(", ")} sont en train d'écrire…`;
  else el.textContent = "Plusieurs personnes écrivent…";
}
setInterval(rendreEcrit, 1000);

// ---------- Flux temps réel ----------
function connecterFlux() {
  etat.flux?.close();
  const flux = new EventSource(`/api/flux?jeton=${encodeURIComponent(etat.jeton)}`);
  etat.flux = flux;
  flux.addEventListener("message", (e) => recevoirMessage(JSON.parse(e.data)));
  flux.addEventListener("reaction", (e) => {
    const d = JSON.parse(e.data);
    appliquerReactions(d.salon, d.id, d.reactions);
  });
  flux.addEventListener("presence", (e) => {
    etat.enLigne = JSON.parse(e.data).enLigne;
    rendreMembres();
  });
  flux.addEventListener("ecrit", (e) => {
    const d = JSON.parse(e.data);
    if (d.membre.id === etat.moi.id) return;
    etat.ecrivent.set(d.membre.id, { nom: d.membre.nom, salon: d.salon, expire: Date.now() + 4000 });
    rendreEcrit();
  });
  let deconnecte = false;
  flux.addEventListener("error", () => {
    if (!deconnecte) notifier("Connexion perdue, reconnexion…");
    deconnecte = true;
  });
  flux.addEventListener("open", async () => {
    if (!deconnecte) return;
    deconnecte = false;
    notifier("Reconnecté ✔");
    // Rattrape les messages manqués pendant la coupure.
    etat.messages.clear();
    await ouvrirSalon(etat.salonActif);
  });
}

// ---------- Panneaux mobiles ----------
function fermerPanneaux() {
  $("#barre-salons").classList.remove("ouvert");
  $("#barre-membres").classList.remove("ouvert");
  $("#voile").hidden = true;
}
function basculer(sel) {
  const ouvert = $(sel).classList.toggle("ouvert");
  $("#voile").hidden = !ouvert;
}
$("#ouvrir-salons").addEventListener("click", () => basculer("#barre-salons"));
$("#ouvrir-membres").addEventListener("click", () => basculer("#barre-membres"));
$("#voile").addEventListener("click", fermerPanneaux);

// ---------- Profil ----------
function rendreProfil() {
  const p = $("#profil");
  p.replaceChildren();
  const av = document.createElement("span");
  av.className = "avatar petit";
  av.style.setProperty("--c", couleur(etat.moi.id));
  av.textContent = initiales(etat.moi.nom);
  const info = document.createElement("div");
  const nom = document.createElement("strong");
  nom.textContent = etat.moi.nom;
  const role = document.createElement("span");
  role.textContent = etat.moi.metier;
  info.append(nom, role);
  const sortir = document.createElement("button");
  sortir.className = "bouton-icone";
  sortir.title = "Se déconnecter";
  sortir.setAttribute("aria-label", "Se déconnecter");
  sortir.textContent = "Quitter";
  sortir.addEventListener("click", () => {
    etat.flux?.close();
    ecrireJeton(null);
    location.hash = "";
    location.reload();
  });
  p.append(av, info, sortir);
}

// ---------- Démarrage ----------
async function demarrerApp() {
  const { salons } = await api("/api/salons");
  etat.salons = salons;
  $("#accueil").hidden = true;
  $("#app").hidden = false;
  rendreProfil();
  connecterFlux();
  await ouvrirSalon(location.hash.slice(1) || "general");
}

window.addEventListener("hashchange", () => {
  if (etat.moi) ouvrirSalon(location.hash.slice(1));
});

(async function init() {
  try {
    etat.config = await api("/api/config");
  } catch {
    notifier("Serveur injoignable. Lancez « npm start » dans le dossier voltchat.");
    return;
  }
  if (etat.jeton) {
    try {
      etat.moi = (await api("/api/moi")).membre;
      return await demarrerApp();
    } catch (err) {
      if (err.statut !== 401) return notifier(err.message);
      etat.jeton = null;
      ecrireJeton(null);
    }
  }
  afficherAccueil();
})();
