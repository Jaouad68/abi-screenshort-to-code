// VoltChat — client web (aucun framework).
const $ = (sel) => document.querySelector(sel);
const CLE_JETON = "voltchat.jeton";

const etat = {
  jeton: lireJeton(),
  moi: null,
  config: { metiers: [], reactions: [], motifs: [], moderation: false },
  salons: [],
  conversations: [], // messages privés : { id, avec, total, dernier }
  filActif: null,
  messages: new Map(), // filId -> tableau de messages chargés
  plusAnciens: new Map(), // filId -> booléen
  nonLus: new Map(),
  enLigne: [],
  ecrivent: new Map(), // membreId -> { nom, salon, expire }
  signalements: 0,
  flux: null,
  edition: null, // id du message en cours de modification
};

const estModerateur = () => etat.moi?.role === "moderateur";

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
  if (res.status === 401 && etat.moi) {
    finDeSession("Votre session a expiré. Reconnectez-vous.");
  }
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
function avatar(membre, petit = false) {
  const av = document.createElement("span");
  av.className = "avatar" + (petit ? " petit" : "");
  av.style.setProperty("--c", couleur(membre.id));
  av.textContent = membre.id === "systeme" ? "⚡" : initiales(membre.nom);
  return av;
}
const fmtHeure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const fmtJour = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const fmtDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });
function libelleJour(date) {
  const d = new Date(date);
  const auj = new Date();
  const hier = new Date(auj);
  hier.setDate(auj.getDate() - 1);
  if (d.toDateString() === auj.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === hier.toDateString()) return "Hier";
  return fmtJour.format(d);
}
const role = (m) => [m.metier, m.entreprise].filter(Boolean).join(" · ");

/** Remplit `el` avec le texte, en transformant les URL http(s) en liens — sans innerHTML. */
function texteAvecLiens(el, texte) {
  el.replaceChildren();
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

function bouton(texte, { classe = "", titre, action } = {}) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = classe;
  b.textContent = texte;
  if (titre) {
    b.title = titre;
    b.setAttribute("aria-label", titre);
  }
  if (action) b.addEventListener("click", action);
  return b;
}

// ---------- Accueil ----------
function afficherAccueil() {
  $("#app").hidden = true;
  $("#accueil").hidden = false;
  const select = $("#form-inscription select[name=metier]");
  select.replaceChildren(new Option("Choisissez votre métier…", ""));
  for (const m of etat.config.metiers) select.append(new Option(m, m));
  $("#bloc-moderation").hidden = !etat.config.moderation;
  $("#form-inscription input[name=nom]").focus();
}

$("#form-inscription").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  const b = e.currentTarget.querySelector("button[type=submit]");
  b.disabled = true;
  $("#erreur-inscription").textContent = "";
  try {
    const r = await api("/api/inscription", {
      methode: "POST",
      corps: {
        nom: f.get("nom"),
        metier: f.get("metier"),
        entreprise: f.get("entreprise"),
        codeModeration: f.get("codeModeration") || undefined,
      },
    });
    etat.jeton = r.jeton;
    ecrireJeton(r.jeton);
    etat.moi = r.membre;
    await demarrerApp();
  } catch (err) {
    $("#erreur-inscription").textContent = err.message;
  } finally {
    b.disabled = false;
  }
});

// ---------- Fils : salons et conversations privées ----------
function infoFil(id) {
  const salon = etat.salons.find((s) => s.id === id);
  if (salon) return { id, prive: false, titre: `${salon.icone} ${salon.nom}`, nom: salon.nom, description: salon.description };
  const c = etat.conversations.find((x) => x.id === id);
  if (c) {
    return {
      id,
      prive: true,
      titre: `💬 ${c.avec.nom}`,
      nom: c.avec.nom,
      description: `Conversation privée · ${role(c.avec)}`,
    };
  }
  return null;
}

function lienFil(id, icone, texte) {
  const a = document.createElement("a");
  a.href = `#${id}`;
  a.className = "salon" + (id === etat.filActif ? " actif" : "");
  const i = typeof icone === "string" ? Object.assign(document.createElement("span"), { className: "salon-icone", textContent: icone }) : icone;
  const nom = document.createElement("span");
  nom.className = "salon-nom";
  nom.textContent = texte;
  a.append(i, nom);
  const n = etat.nonLus.get(id);
  if (n) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = n > 99 ? "99+" : String(n);
    a.append(badge);
  }
  return a;
}

function rendreSalons() {
  const nav = $("#liste-salons");
  nav.replaceChildren(
    ...etat.salons.map((s) => {
      const a = lienFil(s.id, s.icone, s.nom);
      a.title = s.description;
      return a;
    }),
  );
  const prives = $("#liste-conversations");
  if (etat.conversations.length) {
    prives.replaceChildren(...etat.conversations.map((c) => lienFil(c.id, avatar(c.avec, true), c.avec.nom)));
  } else {
    const aide = document.createElement("p");
    aide.className = "aide-vide";
    aide.textContent = "Cliquez sur un membre en ligne pour lui écrire.";
    prives.replaceChildren(aide);
  }
  $("#ouvrir-moderation").hidden = !estModerateur();
  const compteur = $("#compteur-signalements");
  compteur.hidden = !etat.signalements;
  compteur.textContent = String(etat.signalements);
}

async function chargerConversations() {
  etat.conversations = (await api("/api/conversations")).conversations;
  rendreSalons();
}

async function ouvrirFil(id) {
  const fil = infoFil(id) ?? infoFil("general");
  if (!fil) return;
  etat.filActif = fil.id;
  etat.edition = null;
  etat.nonLus.delete(fil.id);
  $("#titre-salon").textContent = fil.titre;
  $("#description-salon").textContent = fil.description;
  $("#champ-message").placeholder = fil.prive ? `Message privé à ${fil.nom}…` : `Écrire dans « ${fil.nom} »…`;
  document.title = `${fil.nom} · VoltChat`;
  rendreSalons();
  fermerPanneaux();
  if (!etat.messages.has(fil.id)) {
    $("#messages").replaceChildren();
    try {
      const r = await api(`/api/salons/${fil.id}/messages`);
      etat.messages.set(fil.id, r.messages);
      etat.plusAnciens.set(fil.id, r.plusAnciens);
    } catch (err) {
      return notifier(err.message);
    }
  }
  if (etat.filActif !== fil.id) return; // l'utilisateur a changé de fil entre-temps
  rendreMessages({ versLeBas: true });
  rendreEcrit();
  $("#champ-message").focus({ preventScroll: true });
}

async function ecrireA(membreId) {
  try {
    const { conversation } = await api("/api/conversations", { methode: "POST", corps: { avec: membreId } });
    if (!etat.conversations.some((c) => c.id === conversation.id)) etat.conversations.unshift(conversation);
    location.hash = conversation.id;
  } catch (err) {
    notifier(err.message);
  }
}

$("#plus-anciens").addEventListener("click", async () => {
  const id = etat.filActif;
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
  const liste = etat.messages.get(etat.filActif) ?? [];
  const fragment = document.createDocumentFragment();
  let precedent = null;
  if (!liste.length) {
    const vide = document.createElement("p");
    vide.className = "vide";
    vide.textContent = infoFil(etat.filActif)?.prive
      ? "Début de votre conversation privée."
      : "Aucun message pour l'instant. Lancez la discussion !";
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
  $("#messages").replaceChildren(fragment);
  $("#plus-anciens").hidden = !etat.plusAnciens.get(etat.filActif);
  if (versLeBas) $("#fil").scrollTop = $("#fil").scrollHeight;
}

function elementMessage(m, suite) {
  const el = $("#modele-message").content.firstElementChild.cloneNode(true);
  el.dataset.id = m.id;
  if (suite) el.classList.add("suite");
  if (m.auteur.id === etat.moi?.id) el.classList.add("moi");
  if (m.auteur.id === "systeme") el.classList.add("systeme");
  el.querySelector(".avatar").replaceWith(avatar(m.auteur));
  el.querySelector(".auteur").textContent = m.auteur.nom;
  el.querySelector(".role").textContent = role(m.auteur) + (m.auteur.role === "moderateur" ? " · 🛡️ modération" : "");
  const t = el.querySelector("time");
  t.dateTime = new Date(m.date).toISOString();
  t.textContent = fmtHeure.format(m.date);
  remplirCorps(el, m);
  // Sur écran tactile (pas de survol), un appui affiche la barre d'actions.
  el.addEventListener("click", (e) => {
    if (e.target.closest("a, button, textarea")) return;
    const deja = el.classList.contains("selectionne");
    document.querySelectorAll(".message.selectionne").forEach((x) => x.classList.remove("selectionne"));
    if (!deja) el.classList.add("selectionne");
  });
  return el;
}

/** Texte (ou éditeur), mention « modifié », réactions et barre d'actions. */
function remplirCorps(el, m) {
  const texte = el.querySelector(".texte");
  if (etat.edition === m.id) texte.replaceChildren(editeur(m));
  else texteAvecLiens(texte, m.texte);
  const modifie = el.querySelector(".modifie") ?? Object.assign(document.createElement("span"), { className: "modifie" });
  modifie.textContent = m.modifie ? "(modifié)" : "";
  modifie.title = m.modifie ? `Modifié le ${fmtDate.format(m.modifie)}` : "";
  el.querySelector(".meta").append(modifie);
  rendreReactions(el.querySelector(".reactions"), m);
}

function editeur(m) {
  const zone = document.createElement("div");
  zone.className = "editeur";
  const champ = document.createElement("textarea");
  champ.value = m.texte;
  champ.maxLength = 2000;
  champ.rows = Math.min(8, m.texte.split("\n").length + 1);
  champ.setAttribute("aria-label", "Modifier le message");
  const aide = document.createElement("p");
  aide.className = "aide";
  aide.textContent = "Entrée pour enregistrer · Échap pour annuler";
  const annuler = () => {
    etat.edition = null;
    rafraichirMessage(m);
    $("#champ-message").focus();
  };
  const enregistrer = async () => {
    const nouveau = champ.value.trim();
    if (!nouveau) return notifier("Le message ne peut pas être vide. Supprimez-le plutôt.");
    if (nouveau === m.texte) return annuler();
    champ.disabled = true;
    try {
      const r = await api(`/api/salons/${m.salon}/messages/${m.id}`, { methode: "PATCH", corps: { texte: nouveau } });
      etat.edition = null;
      appliquerModification(r.message);
    } catch (err) {
      champ.disabled = false;
      notifier(err.message);
    }
  };
  champ.addEventListener("keydown", (e) => {
    if (e.key === "Escape") annuler();
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      enregistrer();
    }
  });
  zone.append(champ, aide);
  requestAnimationFrame(() => {
    champ.focus();
    champ.setSelectionRange(champ.value.length, champ.value.length);
  });
  return zone;
}

function rendreReactions(zone, m) {
  zone.replaceChildren();
  for (const [emoji, qui] of Object.entries(m.reactions)) {
    const b = bouton(`${emoji} ${qui.length}`, {
      classe: "reaction" + (qui.includes(etat.moi?.id) ? " mienne" : ""),
      titre: `${emoji}, ${qui.length} réaction${qui.length > 1 ? "s" : ""}`,
      action: () => reagir(m, emoji),
    });
    zone.append(b);
  }
  const barre = document.createElement("div");
  barre.className = "ajout-reaction";
  for (const emoji of etat.config.reactions) {
    barre.append(bouton(emoji, { titre: `Réagir avec ${emoji}`, action: () => reagir(m, emoji) }));
  }
  const actions = [];
  const mien = m.auteur.id === etat.moi?.id;
  const prive = infoFil(m.salon)?.prive;
  if (mien) actions.push(bouton("✏️", { titre: "Modifier", action: () => commencerEdition(m) }));
  if (mien || (estModerateur() && !prive && m.auteur.id !== "systeme")) {
    actions.push(bouton("🗑️", { titre: "Supprimer", action: () => supprimer(m) }));
  }
  if (!mien && !prive && m.auteur.id !== "systeme") {
    actions.push(bouton("🚩", { titre: "Signaler", action: () => ouvrirSignalement(m) }));
  }
  if (actions.length) {
    const sep = document.createElement("span");
    sep.className = "separateur-actions";
    barre.append(sep, ...actions);
  }
  zone.append(barre);
}

function trouverMessage(salon, id) {
  return etat.messages.get(salon)?.find((x) => x.id === id);
}

function elementDe(id) {
  return document.querySelector(`.message[data-id="${CSS.escape(id)}"]`);
}

function rafraichirMessage(m) {
  if (m.salon !== etat.filActif) return;
  const el = elementDe(m.id);
  if (el) remplirCorps(el, m);
}

function commencerEdition(m) {
  const precedent = etat.edition && trouverMessage(m.salon, etat.edition);
  etat.edition = m.id;
  if (precedent) rafraichirMessage(precedent);
  rafraichirMessage(m);
}

async function supprimer(m) {
  const mien = m.auteur.id === etat.moi?.id;
  if (!confirm(mien ? "Supprimer ce message ?" : `Supprimer le message de ${m.auteur.nom} ?`)) return;
  try {
    await api(`/api/salons/${m.salon}/messages/${m.id}`, { methode: "DELETE" });
    appliquerSuppression(m.salon, m.id);
  } catch (err) {
    notifier(err.message);
  }
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
  const m = trouverMessage(salon, id);
  if (!m) return;
  m.reactions = reactions;
  if (salon !== etat.filActif) return;
  const zone = elementDe(id)?.querySelector(".reactions");
  if (zone) rendreReactions(zone, m);
}

function appliquerModification(message) {
  const m = trouverMessage(message.salon, message.id);
  if (!m) return;
  Object.assign(m, { texte: message.texte, modifie: message.modifie });
  if (etat.edition !== m.id) rafraichirMessage(m);
}

function appliquerSuppression(salon, id) {
  const liste = etat.messages.get(salon);
  const idx = liste?.findIndex((x) => x.id === id) ?? -1;
  if (idx < 0) return;
  liste.splice(idx, 1);
  if (etat.edition === id) etat.edition = null;
  if (salon === etat.filActif) rendreMessages();
}

async function recevoirMessage(m) {
  if (!infoFil(m.salon)) await chargerConversations().catch(() => {}); // nouveau message privé
  const liste = etat.messages.get(m.salon);
  if (liste && !liste.some((x) => x.id === m.id)) liste.push(m);
  etat.ecrivent.delete(m.auteur.id);
  const conv = etat.conversations.find((c) => c.id === m.salon);
  if (conv) {
    conv.dernier = m.date;
    etat.conversations.sort((a, b) => b.dernier - a.dernier);
  }
  if (m.salon === etat.filActif) {
    const fil = $("#fil");
    const enBas = fil.scrollHeight - fil.scrollTop - fil.clientHeight < 120;
    rendreMessages({ versLeBas: enBas || m.auteur.id === etat.moi.id });
    rendreEcrit();
    if (document.hidden && m.auteur.id !== etat.moi.id) signalerOnglet();
  } else if (m.auteur.id !== etat.moi.id) {
    etat.nonLus.set(m.salon, (etat.nonLus.get(m.salon) ?? 0) + 1);
    if (conv) notifier(`💬 Nouveau message privé de ${m.auteur.nom}`);
  }
  rendreSalons();
}

let nonVusOnglet = 0;
function signalerOnglet() {
  nonVusOnglet += 1;
  document.title = `(${nonVusOnglet}) ${infoFil(etat.filActif)?.nom ?? ""} · VoltChat`;
}
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && nonVusOnglet) {
    nonVusOnglet = 0;
    document.title = `${infoFil(etat.filActif)?.nom ?? ""} · VoltChat`;
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
    api(`/api/salons/${etat.filActif}/ecrit`, { methode: "POST" }).catch(() => {});
  }
});
champ.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    $("#form-message").requestSubmit();
  }
  // Flèche haut dans un champ vide : modifier son dernier message.
  if (e.key === "ArrowUp" && !champ.value) {
    const dernier = etat.messages.get(etat.filActif)?.findLast((m) => m.auteur.id === etat.moi.id);
    if (dernier) {
      e.preventDefault();
      commencerEdition(dernier);
    }
  }
});

$("#form-message").addEventListener("submit", async (e) => {
  e.preventDefault();
  const texte = champ.value.trim();
  if (!texte) return;
  const b = e.currentTarget.querySelector("button");
  b.disabled = true;
  try {
    const r = await api(`/api/salons/${etat.filActif}/messages`, { methode: "POST", corps: { texte } });
    champ.value = "";
    champ.style.height = "auto";
    dernierSignalEcrit = 0;
    recevoirMessage(r.message); // le flux SSE le renverra aussi : doublon ignoré
  } catch (err) {
    notifier(err.message);
  } finally {
    b.disabled = false;
    champ.focus();
  }
});

// ---------- Signalement ----------
let messageSignale = null;
function ouvrirSignalement(m) {
  messageSignale = m;
  $("#extrait-signalement").textContent = `${m.auteur.nom} : « ${m.texte.slice(0, 200)}${m.texte.length > 200 ? "…" : ""} »`;
  const select = $("#motif-signalement");
  select.replaceChildren(...etat.config.motifs.map((x) => new Option(x, x)));
  $("#dialogue-signalement").showModal();
}
$("#form-signalement").addEventListener("submit", async (e) => {
  e.preventDefault();
  const m = messageSignale;
  $("#dialogue-signalement").close();
  try {
    await api(`/api/salons/${m.salon}/messages/${m.id}/signalements`, {
      methode: "POST",
      corps: { motif: $("#motif-signalement").value },
    });
    notifier("Merci, le message a été transmis aux modérateurs.");
  } catch (err) {
    notifier(err.message);
  }
});

// ---------- Modération ----------
async function ouvrirModeration() {
  $("#dialogue-moderation").showModal();
  await rendreSignalements();
}
$("#ouvrir-moderation").addEventListener("click", ouvrirModeration);

async function rendreSignalements() {
  const zone = $("#liste-signalements");
  let liste;
  try {
    liste = (await api("/api/signalements")).signalements;
  } catch (err) {
    zone.textContent = err.message;
    return;
  }
  etat.signalements = liste.length;
  rendreSalons();
  if (!liste.length) {
    zone.replaceChildren(Object.assign(document.createElement("p"), { className: "vide", textContent: "Aucun signalement en attente. ✔" }));
    return;
  }
  zone.replaceChildren(
    ...liste.map((s) => {
      const carte = document.createElement("article");
      carte.className = "carte-signalement";
      const tete = document.createElement("p");
      tete.className = "meta-signalement";
      const salon = etat.salons.find((x) => x.id === s.salon);
      tete.textContent = `${s.motif} · ${salon ? salon.nom : s.salon} · signalé par ${s.par.nom} le ${fmtDate.format(s.date)}`;
      const auteur = document.createElement("strong");
      auteur.textContent = `${s.auteur.nom} (${role(s.auteur)})`;
      const extrait = document.createElement("p");
      extrait.className = "extrait";
      extrait.textContent = s.extrait;
      const actions = document.createElement("div");
      actions.className = "actions-dialogue";
      actions.append(
        bouton("Ignorer", { classe: "bouton-icone", action: () => moderer(`/api/signalements/${s.id}`, "DELETE") }),
        bouton("Supprimer le message", {
          classe: "bouton-icone",
          action: () => moderer(`/api/salons/${s.salon}/messages/${s.messageId}`, "DELETE"),
        }),
        bouton("Exclure l'auteur", {
          classe: "bouton-danger",
          action: () => {
            if (confirm(`Exclure ${s.auteur.nom} ? Sa session sera fermée et tous ses messages publics supprimés.`)) {
              moderer(`/api/membres/${s.auteur.id}/exclusion`, "POST");
            }
          },
        }),
      );
      carte.append(auteur, extrait, tete, actions);
      return carte;
    }),
  );
}

async function moderer(chemin, methode) {
  try {
    await api(chemin, { methode });
    await rendreSignalements();
  } catch (err) {
    notifier(err.message);
  }
}

document.querySelectorAll("dialog [data-fermer]").forEach((b) =>
  b.addEventListener("click", () => b.closest("dialog").close()),
);

// ---------- Présence & « est en train d'écrire » ----------
function rendreMembres() {
  $("#compteur-en-ligne").textContent = String(etat.enLigne.length);
  const ul = $("#liste-membres");
  const tries = [...etat.enLigne].sort((a, b) =>
    a.id === etat.moi.id ? -1 : b.id === etat.moi.id ? 1 : a.nom.localeCompare(b.nom, "fr"),
  );
  ul.replaceChildren(
    ...tries.map((m) => {
      const li = document.createElement("li");
      const info = document.createElement("div");
      const nom = document.createElement("strong");
      nom.textContent = m.nom + (m.id === etat.moi.id ? " (vous)" : "") + (m.role === "moderateur" ? " 🛡️" : "");
      const r = document.createElement("span");
      r.textContent = role(m);
      info.append(nom, r);
      if (m.id === etat.moi.id) {
        li.append(avatar(m, true), info);
        return li;
      }
      const b = document.createElement("button");
      b.type = "button";
      b.className = "membre-cliquable";
      b.title = `Envoyer un message privé à ${m.nom}`;
      b.append(avatar(m, true), info, Object.assign(document.createElement("span"), { className: "icone-dm", textContent: "💬" }));
      b.addEventListener("click", () => ecrireA(m.id));
      li.append(b);
      return li;
    }),
  );
}

function rendreEcrit() {
  const maintenant = Date.now();
  const noms = [...etat.ecrivent.values()]
    .filter((x) => x.salon === etat.filActif && x.expire > maintenant)
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
  // Authentifié par le cookie de session HttpOnly : le jeton n'apparaît pas dans l'URL.
  const flux = new EventSource("/api/flux");
  etat.flux = flux;
  const ecouter = (nom, fn) => flux.addEventListener(nom, (e) => fn(JSON.parse(e.data)));
  ecouter("message", recevoirMessage);
  ecouter("modification", appliquerModification);
  ecouter("suppression", (d) => appliquerSuppression(d.salon, d.id));
  ecouter("reaction", (d) => appliquerReactions(d.salon, d.id, d.reactions));
  ecouter("presence", (d) => {
    etat.enLigne = d.enLigne;
    rendreMembres();
  });
  ecouter("ecrit", (d) => {
    if (d.membre.id === etat.moi.id) return;
    etat.ecrivent.set(d.membre.id, { nom: d.membre.nom, salon: d.salon, expire: Date.now() + 4000 });
    rendreEcrit();
  });
  ecouter("conversation", (c) => {
    if (c && !etat.conversations.some((x) => x.id === c.id)) etat.conversations.unshift(c);
    rendreSalons();
  });
  ecouter("signalements", (d) => {
    if (d.total > etat.signalements) notifier("🚩 Nouveau signalement à examiner");
    etat.signalements = d.total;
    rendreSalons();
    if ($("#dialogue-moderation").open) rendreSignalements();
  });
  ecouter("exclu", () => finDeSession("Vous avez été exclu·e par la modération."));
  ecouter("fin", () => finDeSession());

  let deconnecte = false;
  flux.addEventListener("error", async () => {
    if (!etat.moi) return;
    if (!deconnecte) notifier("Connexion perdue, reconnexion…");
    deconnecte = true;
    // Si la session n'est plus valide, EventSource réessaierait indéfiniment.
    if (flux.readyState === EventSource.CLOSED) {
      try {
        await api("/api/moi");
        setTimeout(connecterFlux, 3000);
      } catch { /* 401 : finDeSession() déjà appelé */ }
    }
  });
  flux.addEventListener("open", async () => {
    if (!deconnecte) return;
    deconnecte = false;
    notifier("Reconnecté ✔");
    // Rattrape les messages manqués pendant la coupure.
    etat.messages.clear();
    await chargerConversations().catch(() => {});
    await ouvrirFil(etat.filActif);
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

// ---------- Profil & session ----------
function rendreProfil() {
  const info = document.createElement("div");
  const nom = document.createElement("strong");
  nom.textContent = etat.moi.nom;
  const r = document.createElement("span");
  r.textContent = etat.moi.metier + (estModerateur() ? " · 🛡️" : "");
  info.append(nom, r);
  const sortir = bouton("Quitter", {
    classe: "bouton-icone",
    titre: "Se déconnecter",
    action: async () => {
      await api("/api/deconnexion", { methode: "POST" }).catch(() => {});
      finDeSession();
    },
  });
  $("#profil").replaceChildren(avatar(etat.moi, true), info, sortir);
}

function finDeSession(message) {
  etat.flux?.close();
  etat.moi = null;
  etat.jeton = null;
  ecrireJeton(null);
  if (message) {
    try { sessionStorage.setItem("voltchat.message", message); } catch { /* ignoré */ }
  }
  location.hash = "";
  location.reload();
}

// ---------- Démarrage ----------
async function demarrerApp() {
  const [{ salons }, { conversations }] = await Promise.all([api("/api/salons"), api("/api/conversations")]);
  etat.salons = salons;
  etat.conversations = conversations;
  if (estModerateur()) etat.signalements = (await api("/api/signalements")).signalements.length;
  $("#accueil").hidden = true;
  $("#app").hidden = false;
  rendreProfil();
  connecterFlux();
  await ouvrirFil(location.hash.slice(1) || "general");
}

window.addEventListener("hashchange", () => {
  if (etat.moi) ouvrirFil(location.hash.slice(1));
});

(async function init() {
  try {
    const message = sessionStorage.getItem("voltchat.message");
    if (message) {
      sessionStorage.removeItem("voltchat.message");
      setTimeout(() => notifier(message), 300);
    }
  } catch { /* ignoré */ }
  try {
    etat.config = await api("/api/config");
  } catch {
    notifier("Serveur injoignable. Lancez « npm start » dans le dossier voltchat.");
    return;
  }
  if (etat.jeton) {
    try {
      // Vérifie la session et (re)pose le cookie utilisé par le flux temps réel.
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
