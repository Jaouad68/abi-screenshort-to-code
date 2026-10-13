/* ==========================================================================
   Livre audio : interface web (sans framework, sans compilation)

   Trois écrans, choisis par l'adresse (#/...) pour que le bouton « retour »
   du téléphone fonctionne :
     #/            Bibliothèque : import, conversions, livres
     #/book/<id>   fiche du livre : voix, réglages, chapitres, lancement
     #/job/<id>    conversion : progression, écoute, téléchargements

   Un mini-lecteur persistant permet d'écouter les chapitres en naviguant,
   avec les commandes de l'écran verrouillé (Media Session).
   ========================================================================== */
"use strict";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const app = $("#app");

const state = {
  engines: null,      // réponse de /api/engines (mise en cache)
  book: null,         // livre affiché
  pollTimer: null,    // rafraîchissement périodique
  saveTimer: null,    // enregistrement différé des chapitres
  jobSignature: "",   // évite de reconstruire la liste pendant l'écoute
  hosted: false,      // version en ligne : fichiers temporaires
  preview: null,      // lecture de l'extrait de voix
};

const SETTINGS_KEY = "audiobook.settings.v2";
const DEFAULT_SETTINGS = {
  engine: "edge", voice: "", speed: 1.0, tone: "narration", pause_factor: 1.0,
  bitrate: 128, formats: ["mp3", "m4b"], read_titles: true,
};

const STATUS = {
  queued: ["En attente", "warn"],
  running: ["En cours", "run"],
  done: ["Terminé", "ok"],
  error: ["Erreur", "err"],
  cancelled: ["Arrêtée", "muted"],
  interrupted: ["Interrompue", "warn"],
};

const SAMPLE_TEXT = "Le soir tombait sur la ville. — Vous partez déjà ? demanda-t-elle. Il sourit, sans répondre, et referma doucement la porte.";

/* Icônes au trait, dans l'esprit des SF Symbols. */
const I = {
  chevron: '<svg class="chev" viewBox="0 0 9 15"><path d="M1.5 1.5l6 6-6 6"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M14.5 8.5a3 3 0 0 1 0 4M16.8 6.6a6 6 0 0 1 0 7.8"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="18" cy="12" r="1.8"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  checkCircle: '<svg class="done-check" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5"/><path d="M7.5 12.3l3 3 6-6.3"/></svg>',
  alert: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.2v.3"/></svg>',
  headphones: '<svg viewBox="0 0 24 24"><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3.5" y="14" width="4.5" height="7" rx="1.8"/><rect x="16" y="14" width="4.5" height="7" rx="1.8"/></svg>',
  archive: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4" width="17" height="5" rx="1.5"/><path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9M10 13h4"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  redo: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 1-2.4-5.7L20 7.5M20 3.5v4h-4"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg>',
  shelf: '<svg viewBox="0 0 24 24"><path d="M4 4v16M8.5 4v16M13 5l4.5 15M3 20.5h18"/></svg>',
  sparkles: '<svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>',
};

/* ---------------------------------------------------------------- outils */

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

async function api(path, options = {}) {
  const opts = { ...options };
  if (opts.json !== undefined) {
    opts.body = JSON.stringify(opts.json);
    opts.headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    delete opts.json;
  }
  const res = await fetch(path, opts);
  if (res.status === 404 && /^\/api\/(books|jobs)\/[^/]+/.test(path)) {
    serverForgot();
    throw new Error(GONE);
  }
  if (!res.ok) {
    let msg = `Erreur ${res.status}`;
    try {
      const data = await res.json();
      msg = Array.isArray(data.detail) ? data.detail.map((d) => d.msg).join(", ") : (data.detail || msg);
    } catch (_) { /* réponse non JSON */ }
    throw new Error(msg);
  }
  const type = res.headers.get("content-type") || "";
  return type.includes("application/json") ? res.json() : res;
}

// Le livre ou la conversion affichés n'existent plus sur le serveur : en ligne,
// cela arrive quand l'hébergeur redémarre (mise à jour ou mise en veille), car
// son disque est alors vidé. Un seul message clair, puis retour à l'accueil.
const GONE = "Introuvable sur le serveur.";
let forgotNotified = false;
function serverForgot() {
  stopPolling();
  clearTimeout(state.saveTimer);
  if (!forgotNotified) {
    forgotNotified = true;
    toast(state.hosted
      ? "Le serveur a redémarré et ses fichiers ont été effacés. Réimportez votre livre."
      : "Ce livre ou cette conversion n'existe plus.", true);
    setTimeout(() => { forgotNotified = false; }, 5000);
  }
  if (location.hash !== "#/") location.hash = "#/";
}

function toast(message, isError = false) {
  if (message === GONE) return; // déjà expliqué par serverForgot()
  const el = document.createElement("div");
  el.className = "toast" + (isError ? " err" : "");
  el.innerHTML = `${isError ? I.alert : I.check}<span>${esc(message)}</span>`;
  $("#toasts").appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .3s, transform .3s";
    el.style.opacity = "0";
    el.style.transform = "translateY(-10px)";
    setTimeout(() => el.remove(), 300);
  }, isError ? 6500 : 3000);
}

function fmtDuration(seconds) {
  if (seconds == null || !isFinite(seconds)) return "";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h} h ${String(m).padStart(2, "0")}`;
  if (m) return `${m} min`;
  return `${s} s`;
}
const fmtMinutes = (min) => fmtDuration(min * 60);
function fmtClock(seconds) {
  if (!isFinite(seconds)) return "0:00";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

function hash(text) {
  let h = 0;
  for (const ch of String(text)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return h;
}

/* Couvertures générées : dégradés harmonieux choisis selon le titre. */
const PALETTES = [
  ["#2b1055", "#7597de"], ["#3a1c71", "#d76d77"], ["#0f2027", "#2c5364"],
  ["#5b4fe9", "#d0569c"], ["#134e5e", "#71b280"], ["#41295a", "#2f0743"],
  ["#c04848", "#480048"], ["#1d2b64", "#f8cdda"], ["#0b486b", "#f56217"],
  ["#283c86", "#45a247"], ["#614385", "#516395"], ["#8e2de2", "#4a00e0"],
];
function gradientFor(text) {
  const [a, b] = PALETTES[hash(text) % PALETTES.length];
  return `linear-gradient(155deg, ${a}, ${b})`;
}

function generatedCover(title, author) {
  return `<div class="cover gen" style="background:${gradientFor(title)}">
    <div><div class="gen-title">${esc(title)}</div><div class="gen-rule"></div></div>
    <div class="gen-author">${esc(author || "")}</div>
  </div>`;
}

function coverHtml({ id, title, author, hasCover }) {
  if (!hasCover || !id) return generatedCover(title, author);
  return `<div class="cover"><img src="/api/books/${esc(id)}/cover" alt="" loading="lazy"
    data-fallback-title="${esc(title)}" data-fallback-author="${esc(author || "")}"></div>`;
}

// Image absente (livre supprimé, pas de pochette) : couverture générée à la place.
function wireCovers(root = document) {
  $$("img[data-fallback-title]", root).forEach((img) => {
    img.addEventListener("error", () => {
      const holder = img.closest(".cover");
      if (holder) holder.outerHTML = generatedCover(img.dataset.fallbackTitle, img.dataset.fallbackAuthor);
    }, { once: true });
  });
}

function ringHtml(progress, { id = "", label = "" } = {}) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, progress)));
  return `<div class="ring" ${id ? `id="${id}"` : ""}>
    <svg viewBox="0 0 100 100"><circle class="track-c" cx="50" cy="50" r="${r}"/>
      <circle class="value-c" cx="50" cy="50" r="${r}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"/></svg>
    ${label}
  </div>`;
}

function setRing(el, progress) {
  const circle = el && $(".value-c", el);
  if (!circle) return;
  const c = parseFloat(circle.getAttribute("stroke-dasharray"));
  circle.setAttribute("stroke-dashoffset", (c * (1 - Math.max(0, Math.min(1, progress)))).toFixed(2));
}

function statusHtml(status) {
  const [label, cls] = STATUS[status] || [status, "muted"];
  return `<span class="status ${cls}">${esc(label)}</span>`;
}

function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch (_) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) { /* navigation privée */ }
}

function stopPolling() {
  clearTimeout(state.pollTimer);
  state.pollTimer = null;
}

async function getEngines(force = false) {
  if (!state.engines || force) state.engines = await api("/api/engines");
  return state.engines;
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function loading() {
  app.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
}

/* ---------------------------------------------------------------- navigation */

function setNav({ back = false, title = "" }) {
  $("#nav-back").hidden = !back;
  $("#nav-title").textContent = title;
  updateNavbar();
}

function updateNavbar() {
  $("#navbar").classList.toggle("scrolled", window.scrollY > 24);
}
window.addEventListener("scroll", updateNavbar, { passive: true });

function route() {
  stopPolling();
  stopPreview();
  const parts = (location.hash.replace(/^#\/?/, "") || "").split("/");
  if (parts[0] === "book" && parts[1]) showBook(parts[1]);
  else if (parts[0] === "job" && parts[1]) showJob(parts[1]);
  else showHome();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);

/* ---------------------------------------------------------------- bibliothèque */

function showHome() {
  app.onchange = null;
  document.title = "Livre audio";
  setNav({ back: false, title: "Bibliothèque" });
  app.innerHTML = `
    <h1 class="large-title">Bibliothèque</h1>
    <p class="large-sub">Vos ebooks, lus à voix haute.</p>

    <label class="hero" id="drop">
      <div class="hero-icon">${I.book}</div>
      <h2>Transformez un ebook en livre audio</h2>
      <p>PDF ou Word. Voix naturelle, chapitres détectés automatiquement, export M4B et MP3.</p>
      <span class="btn white" id="pick">${I.plus} Importer un livre</span>
      <input type="file" id="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document">
      <div id="upload-status"></div>
    </label>

    ${state.hosted ? `<div class="info-pill">${I.info}<span>Version en ligne : les fichiers sont effacés quand le serveur se met en veille (15 min sans visite). Téléchargez vos livres audio dès qu'ils sont prêts.</span></div>` : ""}

    <section class="section" id="jobs-section" hidden>
      <div class="section-head"><h2>Conversions</h2></div>
      <div class="group" id="jobs"></div>
    </section>

    <section class="section">
      <div class="section-head"><h2>Mes livres</h2></div>
      <div id="books"><div class="loading"><div class="spinner"></div></div></div>
    </section>`;

  const drop = $("#drop");
  $("#file").addEventListener("change", (e) => e.target.files[0] && uploadFile(e.target.files[0]));
  ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => {
    e.preventDefault();
    drop.classList.add("over");
  }));
  ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, () => drop.classList.remove("over")));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) uploadFile(f);
  });
  refreshHome();
}

async function refreshHome() {
  let books, jobs;
  try {
    [books, jobs] = await Promise.all([api("/api/books"), api("/api/jobs")]);
  } catch (err) {
    toast(err.message, true);
    return;
  }
  const jobsEl = $("#jobs");
  const booksEl = $("#books");
  if (!jobsEl || !booksEl) return; // l'utilisateur a changé d'écran

  const byId = Object.fromEntries(books.map((b) => [b.id, b]));
  $("#jobs-section").hidden = !jobs.length;
  jobsEl.innerHTML = jobs.slice(0, 8).map((j) => {
    const active = j.status === "running" || j.status === "queued";
    const book = byId[j.book_id];
    const sub = active
      ? `${j.chapters_done}/${j.chapters.length} chapitres${j.eta_seconds ? ` · reste ≈ ${fmtDuration(j.eta_seconds)}` : ""}`
      : `${j.chapters.length} chapitres`;
    return `
      <a class="group-row tappable job-row" href="#/job/${esc(j.id)}">
        <div class="mini-cover">${coverHtml({ id: j.book_id, title: j.title, author: j.author, hasCover: book ? book.has_cover : true })}</div>
        <span class="row-label"><span class="title">${esc(j.title)}</span>
          <span class="row-sub">${statusHtml(j.status)} · ${esc(sub)}</span></span>
        ${active ? ringHtml(j.progress, { label: `<span class="ring-label">${Math.floor(j.progress * 100)}</span>` }) : I.chevron}
      </a>`;
  }).join("");

  booksEl.innerHTML = books.length ? `<div class="shelf">${books.map((b) => `
    <div class="book-tile">
      <a href="#/book/${esc(b.id)}" style="color:inherit">
        ${coverHtml({ id: b.id, title: b.title, author: b.author, hasCover: b.has_cover })}
        <div class="tile-title">${esc(b.title)}</div>
        <div class="tile-meta">${esc(b.author || "Auteur inconnu")} · ${fmtMinutes(b.minutes)}</div>
      </a>
      <button class="tile-more" data-del="${esc(b.id)}" data-title="${esc(b.title)}" aria-label="Supprimer ${esc(b.title)}">${I.more}</button>
    </div>`).join("")}</div>`
    : `<div class="empty-state">${I.shelf}<strong>Aucun livre pour l'instant</strong>Importez un PDF ou un fichier Word pour commencer.</div>`;
  wireCovers(app);

  $$("[data-del]", booksEl).forEach((btn) => btn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!confirm(`Supprimer « ${btn.dataset.title} » de la bibliothèque ?\nLes livres audio déjà créés sont conservés.`)) return;
    try {
      await api(`/api/books/${btn.dataset.del}`, { method: "DELETE" });
      refreshHome();
    } catch (err) { toast(err.message, true); }
  }));

  if (jobs.some((j) => j.status === "running" || j.status === "queued")) {
    state.pollTimer = setTimeout(refreshHome, 3000);
  }
}

function uploadFile(file) {
  const status = $("#upload-status");
  if (!/\.(pdf|docx)$/i.test(file.name)) {
    toast("Choisissez un fichier PDF ou Word (.docx).", true);
    return;
  }
  $("#file").disabled = true;
  $("#pick").hidden = true;
  status.innerHTML = `
    <div class="upload">
      <div class="upload-label"><span id="up-label">Envoi de « ${esc(file.name)} »</span><span id="up-pct">0 %</span></div>
      <div class="bar"><div id="up-bar"></div></div>
    </div>`;
  const form = new FormData();
  form.append("file", file);
  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/books");
  xhr.upload.onprogress = (e) => {
    if (!e.lengthComputable) return;
    const pct = Math.round((e.loaded / e.total) * 100);
    $("#up-bar").style.width = pct + "%";
    $("#up-pct").textContent = pct + " %";
  };
  xhr.upload.onload = () => {
    $("#up-label").innerHTML = '<span style="display:inline-flex;gap:10px;align-items:center"><span class="spinner light"></span>Lecture du livre et détection des chapitres…</span>';
    $("#up-pct").textContent = "";
    $("#up-bar").style.width = "100%";
  };
  const fail = (message) => {
    status.innerHTML = `<div class="upload-error">${esc(message)}</div>`;
    $("#file").disabled = false;
    $("#file").value = "";
    $("#pick").hidden = false;
  };
  xhr.onload = () => {
    let data = {};
    try { data = JSON.parse(xhr.responseText); } catch (_) { /* ignore */ }
    if (xhr.status === 200) location.hash = `#/book/${data.id}`;
    else fail(data.detail || "Import impossible.");
  };
  xhr.onerror = () => fail("Connexion perdue avec le serveur.");
  xhr.send(form);
}

/* ---------------------------------------------------------------- fiche du livre */

async function showBook(id) {
  setNav({ back: true, title: "" });
  loading();
  try {
    const [book, engines] = await Promise.all([api(`/api/books/${id}`), getEngines()]);
    state.book = book;
    renderBook(book, engines);
  } catch (err) {
    if (err.message !== GONE) app.innerHTML = `<div class="empty-state">${I.alert}<strong>Impossible d'ouvrir ce livre</strong>${esc(err.message)}</div>`;
  }
}

function bookStats(book) {
  return `
    <span class="stat">${book.included_count}/${book.chapter_count} chapitres</span>
    <span class="stat">≈ ${fmtMinutes(book.minutes)}</span>
    <span class="stat">${book.words.toLocaleString("fr-FR")} mots</span>
    ${book.pages ? `<span class="stat">${book.pages} pages</span>` : ""}`;
}

function radioGroup(name, options, cls = "segmented") {
  return `<div class="${cls}" role="radiogroup">${options.map((o) => `
    <label class="${cls === "chips" ? "chip" : ""}"><input type="radio" name="${name}" value="${esc(o.value)}" ${o.disabled ? "disabled" : ""}><span>${esc(o.label)}</span></label>`).join("")}</div>`;
}

function renderBook(book, engines) {
  document.title = `${book.title} · Livre audio`;
  setNav({ back: true, title: book.title });
  const settings = loadSettings();
  const backdrop = book.has_cover
    ? `<div class="backdrop" style="background-image:url('/api/books/${esc(book.id)}/cover')"></div>`
    : `<div class="backdrop" style="background:${gradientFor(book.title)}"></div>`;

  app.innerHTML = `
    <section class="book-hero">
      ${backdrop}
      ${coverHtml({ id: book.id, title: book.title, author: book.author, hasCover: book.has_cover })}
      <input class="title-input" id="book-title" value="${esc(book.title)}" aria-label="Titre du livre">
      <input class="author-input" id="book-author" value="${esc(book.author)}" placeholder="Ajouter l'auteur" aria-label="Auteur">
      <div class="stat-row" id="book-stats">${bookStats(book)}</div>
    </section>

    <div class="book-layout">
      <div>
        <section class="section">
          <div class="section-head"><h2>Voix</h2></div>
          ${radioGroup("engine", engines.engines.map((e) => ({
            value: e.id, label: e.id === "edge" ? "Naturelle · en ligne" : "Hors ligne", disabled: !e.available,
          })))}
          <div id="engine-notice"></div>
          <div class="voices" id="voices" style="margin-top:12px"></div>
          <div class="group">
            <div class="group-row">
              <button class="play-circle" id="btn-preview" aria-label="Écouter un extrait">${I.play}</button>
              <div class="wave" id="wave">${"<i></i>".repeat(28)}</div>
            </div>
            <div class="group-row tappable" id="sample-toggle">
              <span class="row-label">Texte d'essai</span>${I.chevron}
            </div>
          </div>
          <textarea id="sample" rows="3" hidden style="margin-top:10px">${esc(SAMPLE_TEXT)}</textarea>
        </section>

        <section class="section">
          <div class="section-head"><h2>Lecture</h2></div>
          <div class="group">
            <div class="group-row" style="flex-direction:column;align-items:stretch;gap:6px">
              <div style="display:flex"><span class="row-label">Vitesse</span><span class="row-value" id="speed-val"></span></div>
              <input type="range" id="speed" min="0.7" max="1.5" step="0.05" aria-label="Vitesse de lecture">
            </div>
            <div class="group-row" style="flex-direction:column;align-items:stretch;gap:10px">
              <span class="row-label">Ton</span>
              ${radioGroup("tone", engines.tones.map((t) => ({ value: t.id, label: shortName(t.label) })), "chips")}
            </div>
            <div class="group-row" style="flex-direction:column;align-items:stretch;gap:10px">
              <span class="row-label">Pauses</span>
              ${radioGroup("pauses", [{ value: "0.7", label: "Courtes" }, { value: "1", label: "Normales" }, { value: "1.35", label: "Longues" }])}
            </div>
            <label class="group-row">
              <span class="row-label">Annoncer les chapitres<span class="row-sub">Le titre est lu au début de chaque chapitre</span></span>
              <input type="checkbox" class="switch" id="read-titles">
            </label>
          </div>
        </section>

        <section class="section">
          <div class="section-head"><h2>Export</h2></div>
          <div class="group">
            <div class="group-row" style="flex-direction:column;align-items:stretch;gap:10px">
              <span class="row-label">Qualité audio</span>
              ${radioGroup("bitrate", engines.bitrates.map((b) => ({ value: String(b), label: `${b} kbps` })))}
            </div>
            <label class="group-row indent">
              <span class="row-icon" style="background:linear-gradient(135deg,#ff9f0a,#ff375f)">${I.headphones}</span>
              <span class="row-label">Livre audio M4B<span class="row-sub">Un seul fichier avec chapitres, pour Apple Livres</span></span>
              <input type="checkbox" class="switch" id="fmt-m4b">
            </label>
            <label class="group-row indent">
              <span class="row-icon" style="background:linear-gradient(135deg,#0a84ff,#5e5ce6)">${I.archive}</span>
              <span class="row-label">MP3 par chapitre<span class="row-sub">Compatible avec tous les lecteurs</span></span>
              <input type="checkbox" class="switch" id="fmt-mp3">
            </label>
          </div>
        </section>
      </div>

      <div>
        <section class="section">
          <div class="section-head"><h2>Chapitres</h2><button class="link" id="all-toggle"></button></div>
          <div class="group" id="chapters"></div>
          <p class="footnote">Touchez un chapitre pour le renommer ou corriger son texte. Désactivez ce qui ne doit pas être lu.</p>
        </section>
      </div>
    </div>

    <div class="action-bar">
      <div class="inner">
        <div class="meta"><strong id="est-dur"></strong><span id="est-sub"></span></div>
        <button class="btn primary" id="btn-convert">${I.sparkles} Créer le livre audio</button>
      </div>
    </div>`;
  wireCovers(app);

  // --- métadonnées du livre
  const saveMeta = debounce(async () => {
    try {
      const updated = await api(`/api/books/${book.id}`, {
        method: "PUT",
        json: { title: $("#book-title").value, author: $("#book-author").value },
      });
      Object.assign(state.book, { title: updated.title, author: updated.author });
      $("#nav-title").textContent = updated.title;
    } catch (err) { toast(err.message, true); }
  }, 600);
  $("#book-title").addEventListener("input", saveMeta);
  $("#book-author").addEventListener("input", saveMeta);

  // --- chapitres
  renderChapters();
  $("#all-toggle").addEventListener("click", () => {
    setAllChapters(!state.book.chapters.every((c) => c.include));
  });

  // --- réglages
  let engineId = settings.engine;
  if (!engines.engines.some((e) => e.id === engineId && e.available)) {
    engineId = (engines.engines.find((e) => e.available) || engines.engines[0]).id;
  }
  check("engine", engineId);
  fillVoices(engineId, settings.voice);
  $("#speed").value = settings.speed;
  check("tone", settings.tone) || check("tone", "narration");
  check("pauses", String(settings.pause_factor)) || check("pauses", "1");
  check("bitrate", String(settings.bitrate)) || check("bitrate", "128");
  $("#fmt-mp3").checked = settings.formats.includes("mp3");
  $("#fmt-m4b").checked = settings.formats.includes("m4b");
  $("#read-titles").checked = settings.read_titles;

  $$("input[name=engine]").forEach((r) => r.addEventListener("change", () => {
    fillVoices(r.value, "");
    persist();
  }));
  app.onchange = (e) => {
    if (e.target.matches("input[name=tone], input[name=pauses], input[name=bitrate], input[name=voice], .switch")) persist();
  };
  $("#speed").addEventListener("input", persist);
  $("#sample-toggle").addEventListener("click", () => {
    const area = $("#sample");
    area.hidden = !area.hidden;
    if (!area.hidden) area.focus();
  });
  $("#btn-preview").addEventListener("click", preview);
  $("#btn-convert").addEventListener("click", startConversion);
  persist();
}

function check(name, value) {
  const el = $(`input[name=${name}][value="${CSS.escape(String(value))}"]`);
  if (el && !el.disabled) {
    el.checked = true;
    return true;
  }
  return false;
}

function radioValue(name, fallback) {
  const el = $(`input[name=${name}]:checked`);
  return el ? el.value : fallback;
}

function currentSettings() {
  const formats = [];
  if ($("#fmt-mp3").checked) formats.push("mp3");
  if ($("#fmt-m4b").checked) formats.push("m4b");
  return {
    engine: radioValue("engine", "edge"),
    voice: radioValue("voice", ""),
    speed: parseFloat($("#speed").value),
    tone: radioValue("tone", "narration"),
    pause_factor: parseFloat(radioValue("pauses", "1")),
    bitrate: parseInt(radioValue("bitrate", "128"), 10),
    formats,
    read_titles: $("#read-titles").checked,
  };
}

function voiceName(id) {
  const engine = state.engines && state.engines.engines.find((e) => e.voices.some((v) => v.id === id));
  const v = engine && engine.voices.find((x) => x.id === id);
  return v ? v.name : "";
}

function persist() {
  const s = currentSettings();
  saveSettings(s);
  const slider = $("#speed");
  slider.style.setProperty("--fill-pct", `${((s.speed - 0.7) / 0.8) * 100}%`);
  $("#speed-val").textContent = `× ${s.speed.toFixed(2).replace(".", ",")}`;
  const included = state.book.chapters.filter((c) => c.include).length;
  $("#est-dur").textContent = `≈ ${fmtMinutes(state.book.minutes / s.speed)}`;
  $("#est-sub").textContent = `${included} chapitre${included > 1 ? "s" : ""}${s.voice ? " · " + shortName(voiceName(s.voice)) : ""}`;
  $("#btn-convert").disabled = included === 0;
}

// « Rémy (France) » -> « Rémy » : le drapeau indique déjà le pays.
const shortName = (name) => String(name).replace(/\s*\(.*?\)\s*/g, " ").trim();

const FLAGS = { "fr-FR": "🇫🇷", "fr-BE": "🇧🇪", "fr-CH": "🇨🇭", "fr-CA": "🇨🇦" };

function fillVoices(engineId, selected) {
  const engine = state.engines.engines.find((e) => e.id === engineId);
  const box = $("#voices");
  const notice = $("#engine-notice");
  notice.innerHTML = "";
  if (!engine || !engine.available) {
    box.innerHTML = "";
    notice.innerHTML = `<p class="footnote">${esc(engine ? engine.reason : "Moteur indisponible")}</p>`;
    return;
  }
  box.innerHTML = engine.voices.map((v) => {
    const natural = (v.description || "").includes("naturelle");
    const gender = v.gender === "Female" ? "Voix féminine" : v.gender === "Male" ? "Voix masculine" : (v.description || "").split(",")[0];
    return `
      <label class="voice">
        <input type="radio" name="voice" value="${esc(v.id)}" aria-label="${esc(v.name)}">
        <div class="card">
          <div class="avatar" style="background:${gradientFor(v.id + "voice")}">${esc(v.name.charAt(0).toUpperCase())}</div>
          <div class="name">${esc(shortName(v.name))} ${FLAGS[v.locale] || ""}</div>
          <div class="desc">${esc(gender || v.locale)}</div>
          ${natural ? '<span class="badge-nat">Plus naturelle</span>' : ""}
        </div>
        <span class="check">${I.check}</span>
      </label>`;
  }).join("");
  const wanted = engine.voices.some((v) => v.id === selected) ? selected : engine.default_voice;
  if (wanted) check("voice", wanted);
  const chosen = $("input[name=voice]:checked");
  if (chosen) {
    const card = chosen.closest(".voice").getBoundingClientRect();
    box.scrollLeft += card.left - box.getBoundingClientRect().left - 16;
  }
  if (engine.online) notice.innerHTML = '<p class="footnote">Voix Microsoft neuronales : connexion Internet requise pendant la création.</p>';
}

function renderChapters() {
  const book = state.book;
  const list = $("#chapters");
  list.innerHTML = book.chapters.map((c, i) => `
    <div class="group-row tappable chapter-row ${c.include ? "" : "off"}" data-i="${i}">
      <span class="num">${i + 1}</span>
      <span class="row-label"><span class="title">${esc(c.title)}</span>
        <span class="row-sub">${fmtMinutes(c.minutes)} · ${c.words.toLocaleString("fr-FR")} mots</span></span>
      <input type="checkbox" class="switch" data-role="include" ${c.include ? "checked" : ""} aria-label="Inclure ${esc(c.title)}">
    </div>`).join("");
  $("#all-toggle").textContent = book.chapters.every((c) => c.include) ? "Tout désactiver" : "Tout activer";

  $$(".chapter-row", list).forEach((row) => {
    const i = Number(row.dataset.i);
    const sw = $("[data-role=include]", row);
    sw.addEventListener("click", (e) => e.stopPropagation());
    sw.addEventListener("change", (e) => {
      book.chapters[i].include = e.target.checked;
      row.classList.toggle("off", !e.target.checked);
      $("#all-toggle").textContent = book.chapters.every((c) => c.include) ? "Tout désactiver" : "Tout activer";
      persist();
      scheduleChapterSave();
    });
    row.addEventListener("click", () => editChapter(i));
  });
}

function setAllChapters(value) {
  state.book.chapters.forEach((c) => (c.include = value));
  renderChapters();
  persist();
  scheduleChapterSave();
}

function scheduleChapterSave() {
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(saveChapters, 500);
}

async function saveChapters() {
  clearTimeout(state.saveTimer);
  const book = state.book;
  try {
    const updated = await api(`/api/books/${book.id}`, {
      method: "PUT",
      json: { chapters: book.chapters.map((c) => ({ title: c.title, include: c.include })) },
    });
    Object.assign(book, { included_count: updated.included_count, words: updated.words, minutes: updated.minutes });
    $("#book-stats").innerHTML = bookStats(book);
    persist();
  } catch (err) { toast(err.message, true); }
}

async function editChapter(i) {
  const dlg = $("#dlg-chapter");
  try {
    const ch = await api(`/api/books/${state.book.id}/chapters/${i}`);
    $("#chapter-title").value = ch.title;
    $("#chapter-text").value = ch.text;
  } catch (err) {
    toast(err.message, true);
    return;
  }
  const merge = $("#chapter-merge");
  merge.hidden = i === 0;
  merge.onclick = async () => {
    dlg.close("cancel");
    await mergeChapter(i);
  };
  dlg.returnValue = "";
  dlg.showModal();
  dlg.onclose = async () => {
    if (dlg.returnValue !== "save") return;
    try {
      const book = await api(`/api/books/${state.book.id}/chapters/${i}`, {
        method: "PUT",
        json: { title: $("#chapter-title").value, text: $("#chapter-text").value },
      });
      state.book = book;
      renderChapters();
      $("#book-stats").innerHTML = bookStats(book);
      persist();
      toast("Chapitre enregistré");
    } catch (err) { toast(err.message, true); }
  };
}

async function mergeChapter(i) {
  const ch = state.book.chapters[i];
  if (!confirm(`Fusionner « ${ch.title} » avec le chapitre précédent ?`)) return;
  await saveChapters();
  try {
    state.book = await api(`/api/books/${state.book.id}/chapters/${i}/merge`, { method: "POST" });
    renderChapters();
    $("#book-stats").innerHTML = bookStats(state.book);
    persist();
    toast("Chapitres fusionnés");
  } catch (err) { toast(err.message, true); }
}

function stopPreview() {
  if (state.preview) {
    state.preview.pause();
    URL.revokeObjectURL(state.preview.src);
    state.preview = null;
  }
  const btn = $("#btn-preview");
  if (btn) btn.innerHTML = I.play;
  const wave = $("#wave");
  if (wave) wave.classList.remove("playing");
}

async function preview() {
  if (state.preview && !state.preview.paused) {
    stopPreview();
    return;
  }
  stopPreview();
  const s = currentSettings();
  const btn = $("#btn-preview");
  const wave = $("#wave");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner light"></span>';
  try {
    const res = await api("/api/preview", {
      method: "POST",
      json: { engine: s.engine, voice: s.voice, speed: s.speed, tone: s.tone, text: $("#sample").value || SAMPLE_TEXT },
    });
    const audio = new Audio(URL.createObjectURL(await res.blob()));
    state.preview = audio;
    // Animation de la forme d'onde décalée pour un effet naturel.
    $$("i", wave).forEach((bar, k) => { bar.style.animationDelay = `${(k * 73) % 900}ms`; });
    audio.onended = stopPreview;
    if (!$("#player").paused) $("#player").pause();
    await audio.play();
    btn.innerHTML = I.pause;
    wave.classList.add("playing");
  } catch (err) {
    stopPreview();
    if (err.name !== "NotAllowedError") toast(err.message, true);
  } finally {
    btn.disabled = false;
  }
}

async function startConversion() {
  const s = currentSettings();
  if (!s.formats.length) return toast("Activez au moins un format : M4B ou MP3.", true);
  if (!s.voice) return toast("Choisissez une voix.", true);
  stopPreview();
  await saveChapters();
  const btn = $("#btn-convert");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner light"></span> Préparation…';
  try {
    const job = await api("/api/jobs", {
      method: "POST",
      json: { book_id: state.book.id, ...s, title: $("#book-title").value, author: $("#book-author").value },
    });
    location.hash = `#/job/${job.id}`;
  } catch (err) {
    toast(err.message, true);
    btn.disabled = false;
    btn.innerHTML = `${I.sparkles} Créer le livre audio`;
  }
}

/* ---------------------------------------------------------------- conversion */

async function showJob(id) {
  app.onchange = null;
  state.jobSignature = "";
  setNav({ back: true, title: "" });
  loading();
  await refreshJob(id, true);
}

async function refreshJob(id, first = false) {
  let job;
  try {
    job = await api(`/api/jobs/${id}`);
  } catch (err) {
    if (err.message === GONE) return;
    if (first) app.innerHTML = `<div class="empty-state">${I.alert}<strong>Conversion introuvable</strong>${esc(err.message)}</div>`;
    else state.pollTimer = setTimeout(() => refreshJob(id), 4000); // coupure réseau passagère
    return;
  }
  if (location.hash !== `#/job/${id}`) return;
  renderJob(job);
  if (job.status === "running" || job.status === "queued") {
    state.pollTimer = setTimeout(() => refreshJob(id), 1500);
  }
}

function jobCover(job) {
  return coverHtml({ id: job.book_id, title: job.title, author: job.author, hasCover: true });
}

function renderJob(job) {
  const done = job.status === "done";
  document.title = done ? `${job.title} · Livre audio` : `${Math.floor(job.progress * 100)} % · ${job.title}`;
  const active = job.status === "running" || job.status === "queued";
  const resumable = ["error", "cancelled", "interrupted"].includes(job.status);

  // La liste n'est reconstruite que si quelque chose a changé.
  const signature = `${job.status}|${job.chapters_done}|${job.current_chapter}|${job.m4b}`;
  const rebuild = signature !== state.jobSignature || !$("#job-ring");
  state.jobSignature = signature;

  if (rebuild) {
    setNav({ back: true, title: job.title });
    app.innerHTML = `
      <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
        <linearGradient id="ring-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#7b6cff"/><stop offset=".55" stop-color="#b14fe0"/><stop offset="1" stop-color="#ff5fa2"/>
        </linearGradient></defs></svg>
      <section class="job-hero">
        ${ringHtml(job.progress, { id: "job-ring", label: `<div class="ring-inner">${jobCover(job)}<div class="veil"></div><div class="pct" id="job-pct"></div></div>` })}
        <h1>${esc(job.title)}</h1>
        <div class="author">${esc(job.author || "")}</div>
        <div class="stat-row" id="job-stats"></div>
        <div class="message" id="job-message"></div>
        <div id="job-error"></div>
        <div class="job-actions">
          ${active ? `<button class="btn small danger" id="btn-cancel">${I.stop} Arrêter</button>` : ""}
          ${resumable ? `<button class="btn small primary" id="btn-resume">${I.redo} Reprendre</button>` : ""}
          <a class="btn small" href="#/book/${esc(job.book_id)}">${I.book} Voir le livre</a>
          ${!active ? `<button class="btn small danger" id="btn-delete">${I.trash} Supprimer</button>` : ""}
        </div>
      </section>

      ${(job.m4b_url || job.zip_url) ? `
      <section class="section">
        <div class="section-head"><h2>Télécharger</h2></div>
        <div class="download-grid">
          ${job.m4b_url ? `<a class="download" href="${esc(job.m4b_url)}" download>
            <span class="row-icon" style="background:linear-gradient(135deg,#ff9f0a,#ff375f)">${I.headphones}</span>
            <span><span class="t">Livre audio M4B</span><br><span class="s">Avec chapitres · Apple Livres, BookPlayer</span></span>
            <span class="dl">${I.download}</span></a>` : ""}
          ${job.zip_url ? `<a class="download" href="${esc(job.zip_url)}" download>
            <span class="row-icon" style="background:linear-gradient(135deg,#0a84ff,#5e5ce6)">${I.archive}</span>
            <span><span class="t">Tous les MP3</span><br><span class="s">Archive ZIP · un fichier par chapitre</span></span>
            <span class="dl">${I.download}</span></a>` : ""}
        </div>
      </section>` : ""}

      <section class="section">
        <div class="section-head"><h2>Chapitres</h2></div>
        <div class="group" id="tracks">${job.chapters.map((c) => trackHtml(job, c)).join("")}</div>
      </section>`;
    wireCovers(app);
    markPlaying();

    $$(".track-play", app).forEach((btn) => btn.addEventListener("click", () => {
      playTrack({ url: btn.dataset.url, title: btn.dataset.title, job });
    }));
    const cancel = $("#btn-cancel");
    if (cancel) cancel.addEventListener("click", async () => {
      if (!confirm("Arrêter la création ? Vous pourrez la reprendre plus tard sans tout recommencer.")) return;
      cancel.disabled = true;
      try {
        await api(`/api/jobs/${job.id}/cancel`, { method: "POST" });
        stopPolling();
        setTimeout(() => refreshJob(job.id), 500);
      } catch (err) {
        toast(err.message, true);
        cancel.disabled = false;
      }
    });
    const resume = $("#btn-resume");
    if (resume) resume.addEventListener("click", async () => {
      try {
        await api(`/api/jobs/${job.id}/resume`, { method: "POST" });
        stopPolling();
        refreshJob(job.id);
      } catch (err) { toast(err.message, true); }
    });
    const del = $("#btn-delete");
    if (del) del.addEventListener("click", async () => {
      if (!confirm("Supprimer cette conversion et ses fichiers audio ?")) return;
      try {
        await api(`/api/jobs/${job.id}`, { method: "DELETE" });
        location.hash = "#/";
      } catch (err) { toast(err.message, true); }
    });
  }

  // Mise à jour légère à chaque rafraîchissement.
  setRing($("#job-ring"), done ? 1 : job.progress);
  $("#job-pct").innerHTML = done
    ? '<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
    : `${Math.floor(job.progress * 100)}<small> %</small>`;
  const total = job.chapters.length;
  const chapterInfo = job.current_chapter && !done ? `Chapitre ${job.current_chapter}/${total}` : `${job.chapters_done}/${total} chapitres`;
  const listened = job.chapters.reduce((sum, c) => sum + (c.duration || 0), 0);
  $("#job-stats").innerHTML = `
    <span class="stat">${statusHtml(job.status)}</span>
    <span class="stat">${esc(chapterInfo)}</span>
    ${job.eta_seconds && active ? `<span class="stat">Reste ≈ ${esc(fmtDuration(job.eta_seconds))}</span>` : ""}
    ${done && listened ? `<span class="stat">${esc(fmtDuration(listened))} d'écoute</span>` : ""}`;
  $("#job-message").textContent = done ? "Votre livre audio est prêt." : (job.message || "");
  $("#job-error").innerHTML = job.error ? `<div class="job-error">${esc(job.error)}</div>` : "";
}

function trackHtml(job, c) {
  const file = c.mp3 ? job.files.find((f) => f.name === c.mp3) : null;
  const current = job.status === "running" && job.current_chapter === c.number;
  let state = '<span class="dot"></span>';
  if (file) state = `<button class="track-play" data-url="${esc(file.url)}" data-title="${esc(c.title)}" aria-label="Écouter ${esc(c.title)}">${I.play}</button>`;
  else if (c.status === "done") state = I.checkCircle;
  else if (current) state = '<span class="spinner"></span>';
  const sub = c.status === "done"
    ? fmtClock(c.duration)
    : current ? "Création en cours…" : (job.status === "running" || job.status === "queued") ? "En attente" : "Non créé";
  return `
    <div class="group-row track-row" data-url="${file ? esc(file.url) : ""}">
      <span class="state">${state}</span>
      <span class="row-label"><span class="title" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.number}. ${esc(c.title)}</span>
        <span class="row-sub">${esc(sub)}</span></span>
      ${file ? `<a class="track-dl" href="${esc(file.url)}" download aria-label="Télécharger le MP3">${I.download}</a>` : ""}
    </div>`;
}

/* ---------------------------------------------------------------- mini-lecteur */

const player = $("#player");
const mini = $("#miniplayer");
let nowPlaying = null;

function updateMiniHeight() {
  const h = mini.hidden ? 0 : mini.offsetHeight;
  document.documentElement.style.setProperty("--mp-height", `${h}px`);
}

function playTrack({ url, title, job }) {
  stopPreview();
  if (nowPlaying && nowPlaying.url === url) {
    player.paused ? player.play() : player.pause();
    return;
  }
  nowPlaying = { url, title, book: job.title, author: job.author, bookId: job.book_id };
  player.src = url;
  player.play().catch(() => {});
  $("#mp-title").textContent = title;
  $("#mp-sub").textContent = job.title;
  $("#mp-art").innerHTML = jobCover(job);
  wireCovers(mini);
  mini.hidden = false;
  updateMiniHeight();
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title, artist: job.author || "", album: job.title,
      artwork: [{ src: `/api/books/${job.book_id}/cover`, sizes: "512x768", type: "image/jpeg" }],
    });
    navigator.mediaSession.setActionHandler("play", () => player.play());
    navigator.mediaSession.setActionHandler("pause", () => player.pause());
    navigator.mediaSession.setActionHandler("seekbackward", () => { player.currentTime = Math.max(0, player.currentTime - 15); });
    navigator.mediaSession.setActionHandler("seekforward", () => { player.currentTime += 30; });
  }
  markPlaying();
}

function markPlaying() {
  $$(".track-row").forEach((row) => {
    const playing = nowPlaying && row.dataset.url === nowPlaying.url && !player.paused;
    row.classList.toggle("playing", Boolean(playing));
    const btn = $(".track-play", row);
    if (btn) btn.innerHTML = playing ? I.pause : I.play;
  });
  $("#mp-play").innerHTML = player.paused ? I.play : I.pause;
}

player.addEventListener("play", markPlaying);
player.addEventListener("pause", markPlaying);
player.addEventListener("ended", markPlaying);
player.addEventListener("timeupdate", () => {
  const d = player.duration || 0;
  $("#mp-bar").style.width = d ? `${(player.currentTime / d) * 100}%` : "0";
  if (nowPlaying) $("#mp-sub").textContent = `${fmtClock(player.currentTime)} / ${fmtClock(d)} · ${nowPlaying.book}`;
});
$("#mp-play").addEventListener("click", () => (player.paused ? player.play() : player.pause()));
$("#mp-back").addEventListener("click", () => { player.currentTime = Math.max(0, player.currentTime - 15); });
$("#mp-close").addEventListener("click", () => {
  player.pause();
  player.removeAttribute("src");
  nowPlaying = null;
  mini.hidden = true;
  updateMiniHeight();
  markPlaying();
});
$(".mp-progress").addEventListener("click", (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  if (player.duration) player.currentTime = ((e.clientX - rect.left) / rect.width) * player.duration;
});
window.addEventListener("resize", updateMiniHeight);

/* ---------------------------------------------------------------- téléphone */

$("#btn-phone").addEventListener("click", async () => {
  const dlg = $("#dlg-phone");
  const box = $("#phone-content");
  box.innerHTML = '<div class="loading" style="padding:30px 0"><div class="spinner"></div></div>';
  dlg.showModal();
  try {
    const info = await api("/api/server-info");
    if (info.lan && info.urls.length) {
      box.innerHTML = `
        <ol class="steps">
          <li>Connectez le téléphone au <strong>même Wi-Fi</strong> que cet ordinateur.</li>
          <li>Scannez ce QR code avec l'appareil photo.</li>
          <li>Partager, puis « Sur l'écran d'accueil » pour l'avoir comme une application.</li>
        </ol>
        <div class="qr">${info.qr_svg}</div>
        <div class="url">${esc(info.urls[0])}</div>
        <p class="footnote">Ce lien contient une clé secrète : ne le partagez pas. L'ordinateur doit rester allumé.</p>`;
    } else {
      box.innerHTML = `
        <div class="group"><div class="group-row"><span class="row-label">L'accès depuis le téléphone n'est pas activé.
          <span class="row-sub">Relancez l'application avec Lancer-telephone.bat (ou python run.py --lan). Au premier lancement, autorisez le pare-feu pour les réseaux privés.</span></span></div></div>`;
    }
  } catch (err) {
    box.innerHTML = `<p class="footnote">${esc(err.message)}</p>`;
  }
});

/* ---------------------------------------------------------------- démarrage */

// Service worker : uniquement en contexte sécurisé (localhost ou HTTPS).
if ("serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker.register("sw.js").catch(() => { /* facultatif */ });
}

// Version en ligne : le bouton « Sur le téléphone » n'a pas de sens.
api("/api/server-info")
  .then((info) => {
    state.hosted = Boolean(info.hosted);
    if (state.hosted) {
      $("#btn-phone").hidden = true;
      if (!location.hash || location.hash === "#/") showHome();
    }
  })
  .catch(() => { /* facultatif */ });

route();
