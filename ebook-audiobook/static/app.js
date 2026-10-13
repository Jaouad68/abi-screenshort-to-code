/* ==========================================================================
   Ebook vers livre audio : interface web (sans framework, sans compilation)

   Trois écrans, choisis par l'adresse (#/...) pour que le bouton « retour »
   du téléphone fonctionne :
     #/            accueil : import, conversions, livres
     #/book/<id>   chapitres + réglages de voix + lancement
     #/job/<id>    progression et téléchargements
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
  jobSignature: "",   // évite de reconstruire les lecteurs audio pendant l'écoute
};

const SETTINGS_KEY = "audiobook.settings";
const DEFAULT_SETTINGS = {
  engine: "edge", voice: "", speed: 1.0, tone: "neutre", pause_factor: 1.0,
  bitrate: 128, formats: ["mp3", "m4b"], read_titles: true,
};

const STATUS = {
  queued: ["En attente", "warn"],
  running: ["En cours", "run"],
  done: ["Terminé", "ok"],
  error: ["Erreur", "err"],
  cancelled: ["Annulé", ""],
  interrupted: ["Interrompu", "warn"],
};

const ICONS = {
  upload: '<svg viewBox="0 0 24 24" width="42" height="42" aria-hidden="true"><path fill="currentColor" d="M12 3l5 5h-3v6h-4V8H7l5-5zm-7 14h14v2H5v-2z"/></svg>',
  edit: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M4 17.3V20h2.7l8-8-2.7-2.7-8 8zM19.7 7.6a1 1 0 0 0 0-1.4l-1.9-1.9a1 1 0 0 0-1.4 0l-1.5 1.5 3.3 3.3 1.5-1.5z"/></svg>',
  merge: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 4l-5 5h3.5v4.5L5 19l1.4 1.4 6.6-6.6V9H17l-5-5z"/></svg>',
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

function toast(message, isError = false) {
  const el = document.createElement("div");
  el.className = "toast" + (isError ? " err" : "");
  el.textContent = message;
  $("#toasts").appendChild(el);
  setTimeout(() => el.remove(), isError ? 7000 : 3500);
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
const fmtDate = (ts) => new Date(ts * 1000).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

function badge(status) {
  const [label, cls] = STATUS[status] || [status, ""];
  return `<span class="badge ${cls}">${esc(label)}</span>`;
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

/* ---------------------------------------------------------------- routeur */

function route() {
  stopPolling();
  const parts = (location.hash.replace(/^#\/?/, "") || "").split("/");
  if (parts[0] === "book" && parts[1]) showBook(parts[1]);
  else if (parts[0] === "job" && parts[1]) showJob(parts[1]);
  else showHome();
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);

/* ---------------------------------------------------------------- accueil */

function showHome() {
  document.title = "Ebook vers livre audio";
  app.innerHTML = `
    <section class="card">
      <label class="dropzone" id="drop">
        ${ICONS.upload}
        <strong>Importer un ebook</strong>
        <span class="muted">PDF ou Word (.docx). Glissez-déposez le fichier ou touchez pour le choisir.</span>
        <input type="file" id="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document">
      </label>
      <div id="upload-status"></div>
    </section>
    <section class="card">
      <div class="card-head"><h2>Conversions</h2></div>
      <div id="jobs" class="list"><div class="empty">Chargement…</div></div>
    </section>
    <section class="card">
      <div class="card-head"><h2>Mes livres</h2></div>
      <div id="books" class="list"><div class="empty">Chargement…</div></div>
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

  jobsEl.innerHTML = jobs.length ? jobs.map((j) => `
    <a class="item" href="#/job/${esc(j.id)}" style="text-decoration:none;color:inherit">
      <div class="grow">
        <div class="title">${esc(j.title)}</div>
        <div class="meta">${j.chapters_done}/${j.chapters.length} chapitres · ${esc(fmtDate(j.created_at))}</div>
        ${j.status === "running" ? `<div class="progress thin" style="margin-top:6px"><div style="width:${(j.progress * 100).toFixed(1)}%"></div></div>` : ""}
      </div>
      ${badge(j.status)}
    </a>`).join("") : '<div class="empty">Aucune conversion pour l\'instant.</div>';

  booksEl.innerHTML = books.length ? books.map((b) => `
    <div class="item">
      <a class="cover-link" href="#/book/${esc(b.id)}">
        ${b.has_cover ? `<img class="thumb" src="/api/books/${esc(b.id)}/cover" alt="" loading="lazy">` : '<div class="thumb placeholder">📖</div>'}
      </a>
      <div class="grow">
        <div class="title">${esc(b.title)}</div>
        <div class="meta">${esc(b.author || "Auteur inconnu")} · ${b.chapter_count} chapitres · ≈ ${fmtMinutes(b.minutes)} · ${esc(b.source_type.toUpperCase())}</div>
      </div>
      <div class="btn-row">
        <a class="btn small primary" href="#/book/${esc(b.id)}">Ouvrir</a>
        <button class="btn small ghost danger" data-del="${esc(b.id)}" title="Supprimer ce livre">✕</button>
      </div>
    </div>`).join("") : '<div class="empty">Importez un premier livre ci-dessus.</div>';

  $$("[data-del]", booksEl).forEach((btn) => btn.addEventListener("click", async () => {
    if (!confirm("Supprimer ce livre ? Les conversions déjà terminées sont conservées.")) return;
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
  status.innerHTML = `
    <div style="margin-top:14px">
      <div class="range-label"><span id="up-label">Envoi de « ${esc(file.name)} »…</span><span id="up-pct">0 %</span></div>
      <div class="progress" style="margin-top:6px"><div id="up-bar" style="width:0%"></div></div>
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
    $("#up-label").innerHTML = '<span style="display:inline-flex;gap:8px;align-items:center"><span class="spinner"></span> Analyse du livre : extraction, nettoyage, chapitres…</span>';
    $("#up-pct").textContent = "";
  };
  xhr.onload = () => {
    let data = {};
    try { data = JSON.parse(xhr.responseText); } catch (_) { /* ignore */ }
    if (xhr.status === 200) {
      location.hash = `#/book/${data.id}`;
    } else {
      status.innerHTML = `<div class="notice err" style="margin-top:12px">${esc(data.detail || "Import impossible.")}</div>`;
    }
  };
  xhr.onerror = () => {
    status.innerHTML = '<div class="notice err" style="margin-top:12px">Connexion perdue avec l\'ordinateur.</div>';
  };
  xhr.send(form);
}

/* ---------------------------------------------------------------- livre */

async function showBook(id) {
  app.innerHTML = '<div class="empty"><span class="spinner" style="display:inline-block"></span></div>';
  try {
    const [book, engines] = await Promise.all([api(`/api/books/${id}`), getEngines()]);
    state.book = book;
    renderBook(book, engines);
  } catch (err) {
    app.innerHTML = `<div class="notice err">${esc(err.message)}</div><a class="btn" href="#/">Retour</a>`;
  }
}

function bookStats(book) {
  return `
    <span>${book.included_count}/${book.chapter_count} chapitres sélectionnés</span>
    <span>${book.words.toLocaleString("fr-FR")} mots</span>
    <span>≈ ${fmtMinutes(book.minutes)} d'écoute</span>
    ${book.pages ? `<span>${book.pages} pages</span>` : ""}`;
}

function renderBook(book, engines) {
  document.title = `${book.title} · Livre audio`;
  const settings = loadSettings();

  app.innerHTML = `
    <a href="#/" class="btn ghost small" style="margin-bottom:12px">← Accueil</a>
    <section class="card book-head">
      ${book.has_cover ? `<img src="/api/books/${esc(book.id)}/cover" alt="Couverture">` : ""}
      <div class="grow">
        <div class="grid-2">
          <label class="field">Titre <input type="text" id="book-title" value="${esc(book.title)}"></label>
          <label class="field">Auteur <input type="text" id="book-author" value="${esc(book.author)}" placeholder="Auteur"></label>
        </div>
        <div class="stats" id="book-stats">${bookStats(book)}</div>
        <div class="muted" style="font-size:.85rem;margin-top:4px">Source : ${esc(book.source_name)}</div>
      </div>
    </section>

    <div class="layout">
      <section class="card">
        <div class="card-head">
          <h2>Chapitres détectés</h2>
          <div class="btn-row">
            <button class="btn small" id="all-on">Tout cocher</button>
            <button class="btn small" id="all-off">Tout décocher</button>
          </div>
        </div>
        <p class="muted" style="margin-top:0;font-size:.9rem">Décochez ce qui ne doit pas être lu (sommaire, mentions légales…). Cliquez sur un titre pour le renommer : il sera lu au début du chapitre et affiché dans le lecteur.</p>
        <div class="chapters" id="chapters"></div>
      </section>

      <section class="card sticky" id="settings-card">
        <h2>Voix et export</h2>
        <div class="engines" id="engines"></div>
        <div id="engine-notice"></div>
        <label class="field">Voix <select id="voice"></select></label>
        <label class="field">
          <span class="range-label"><span>Vitesse</span><span id="speed-val"></span></span>
          <input type="range" id="speed" min="0.7" max="1.5" step="0.05">
        </label>
        <div class="grid-2">
          <label class="field">Ton
            <select id="tone">${engines.tones.map((t) => `<option value="${esc(t.id)}">${esc(t.label)}</option>`).join("")}</select>
          </label>
          <label class="field">Pauses
            <select id="pauses">
              <option value="0.7">Courtes</option>
              <option value="1">Normales</option>
              <option value="1.35">Longues</option>
            </select>
          </label>
        </div>
        <details style="margin-bottom:14px">
          <summary style="cursor:pointer;font-weight:600">Texte d'essai</summary>
          <textarea id="sample" rows="3" style="margin-top:8px">Le soir tombait sur la ville. — Vous partez déjà ? demanda-t-elle. Il sourit, sans répondre, et referma doucement la porte.</textarea>
        </details>
        <button class="btn" id="btn-preview" style="width:100%">▶ Écouter un extrait</button>
        <audio id="preview-audio" controls hidden></audio>

        <hr style="border:0;border-top:1px solid var(--border);margin:18px 0">
        <div class="grid-2">
          <label class="field">Qualité
            <select id="bitrate">${engines.bitrates.map((b) => `<option value="${b}">${b} kbps</option>`).join("")}</select>
          </label>
          <div class="field">Formats
            <label class="check"><input type="checkbox" id="fmt-mp3"> MP3 par chapitre</label>
            <label class="check"><input type="checkbox" id="fmt-m4b"> M4B avec chapitres</label>
          </div>
        </div>
        <label class="check"><input type="checkbox" id="read-titles"> Lire le titre au début de chaque chapitre</label>
        <button class="btn primary big" id="btn-convert" style="margin-top:10px">Lancer la conversion</button>
        <div class="estimate" id="estimate"></div>
      </section>
    </div>`;

  // --- métadonnées du livre
  const saveMeta = debounce(async () => {
    try {
      const updated = await api(`/api/books/${book.id}`, {
        method: "PUT",
        json: { title: $("#book-title").value, author: $("#book-author").value },
      });
      Object.assign(state.book, { title: updated.title, author: updated.author });
    } catch (err) { toast(err.message, true); }
  }, 600);
  $("#book-title").addEventListener("input", saveMeta);
  $("#book-author").addEventListener("input", saveMeta);

  // --- chapitres
  renderChapters();
  $("#all-on").addEventListener("click", () => setAllChapters(true));
  $("#all-off").addEventListener("click", () => setAllChapters(false));

  // --- réglages
  const engineList = engines.engines;
  $("#engines").innerHTML = engineList.map((e) => `
    <label class="engine-opt ${e.available ? "" : "disabled"}">
      <input type="radio" name="engine" value="${esc(e.id)}" ${e.available ? "" : "disabled"}>
      <span><strong>${esc(e.label)}</strong><small class="muted">${esc(e.reason)}</small></span>
    </label>`).join("");

  let engineId = settings.engine;
  if (!engineList.some((e) => e.id === engineId && e.available)) {
    engineId = (engineList.find((e) => e.available) || engineList[0]).id;
  }
  const radio = $(`input[name=engine][value="${engineId}"]`);
  if (radio) radio.checked = true;
  fillVoices(engineId, settings.voice);

  $("#speed").value = settings.speed;
  $("#tone").value = settings.tone;
  $("#pauses").value = String(settings.pause_factor);
  if (!$("#pauses").value) $("#pauses").value = "1";
  $("#bitrate").value = String(settings.bitrate);
  $("#fmt-mp3").checked = settings.formats.includes("mp3");
  $("#fmt-m4b").checked = settings.formats.includes("m4b");
  $("#read-titles").checked = settings.read_titles;

  $$("input[name=engine]").forEach((r) => r.addEventListener("change", () => {
    fillVoices(r.value, "");
    persist();
  }));
  ["voice", "speed", "tone", "pauses", "bitrate", "fmt-mp3", "fmt-m4b", "read-titles"]
    .forEach((idName) => $("#" + idName).addEventListener("input", persist));

  $("#btn-preview").addEventListener("click", preview);
  $("#btn-convert").addEventListener("click", startConversion);
  persist();
}

function currentSettings() {
  const formats = [];
  if ($("#fmt-mp3").checked) formats.push("mp3");
  if ($("#fmt-m4b").checked) formats.push("m4b");
  return {
    engine: ($("input[name=engine]:checked") || {}).value || "edge",
    voice: $("#voice").value,
    speed: parseFloat($("#speed").value),
    tone: $("#tone").value,
    pause_factor: parseFloat($("#pauses").value),
    bitrate: parseInt($("#bitrate").value, 10),
    formats,
    read_titles: $("#read-titles").checked,
  };
}

function persist() {
  const s = currentSettings();
  saveSettings(s);
  $("#speed-val").textContent = `× ${s.speed.toFixed(2)}`;
  const minutes = state.book.minutes / s.speed;
  $("#estimate").textContent = `Durée d'écoute estimée : ≈ ${fmtMinutes(minutes)}`;
}

function fillVoices(engineId, selected) {
  const engine = state.engines.engines.find((e) => e.id === engineId);
  const select = $("#voice");
  const notice = $("#engine-notice");
  notice.innerHTML = "";
  if (!engine || !engine.available) {
    select.innerHTML = "";
    notice.innerHTML = `<div class="notice warn">${esc(engine ? engine.reason : "Moteur indisponible")}</div>`;
    return;
  }
  // Regroupe les voix par pays.
  const groups = {};
  engine.voices.forEach((v) => (groups[v.locale] = groups[v.locale] || []).push(v));
  const names = { "fr-FR": "France", "fr-BE": "Belgique", "fr-CH": "Suisse", "fr-CA": "Canada" };
  select.innerHTML = Object.entries(groups).map(([loc, voices]) => `
    <optgroup label="${esc(names[loc] || loc)}">
      ${voices.map((v) => `<option value="${esc(v.id)}">${esc(v.name)}${v.description ? " · " + esc(v.description) : ""}</option>`).join("")}
    </optgroup>`).join("");
  const wanted = engine.voices.some((v) => v.id === selected) ? selected : engine.default_voice;
  if (wanted) select.value = wanted;
  if (engine.online) {
    notice.innerHTML = '<div class="notice">Connexion Internet requise pendant la conversion.</div>';
  }
}

function renderChapters() {
  const book = state.book;
  const list = $("#chapters");
  list.innerHTML = book.chapters.map((c, i) => `
    <div class="chapter ${c.include ? "" : "off"}" data-i="${i}">
      <input type="checkbox" data-role="include" ${c.include ? "checked" : ""} aria-label="Inclure le chapitre ${i + 1}">
      <span class="num">${i + 1}</span>
      <input type="text" data-role="title" value="${esc(c.title)}" aria-label="Titre du chapitre ${i + 1}">
      <div class="side">
        <span class="dur">${c.words.toLocaleString("fr-FR")} mots · ${fmtMinutes(c.minutes)}</span>
        <button class="icon-btn" data-role="edit" title="Voir et corriger le texte">${ICONS.edit}</button>
        ${i > 0 ? `<button class="icon-btn" data-role="merge" title="Fusionner avec le chapitre précédent">${ICONS.merge}</button>` : ""}
      </div>
      <div class="preview">${esc(c.preview.slice(0, 160))}${c.preview.length > 160 ? "…" : ""}</div>
    </div>`).join("");

  $$(".chapter", list).forEach((row) => {
    const i = Number(row.dataset.i);
    $("[data-role=include]", row).addEventListener("change", (e) => {
      book.chapters[i].include = e.target.checked;
      row.classList.toggle("off", !e.target.checked);
      scheduleChapterSave();
    });
    $("[data-role=title]", row).addEventListener("input", (e) => {
      book.chapters[i].title = e.target.value;
      scheduleChapterSave();
    });
    $("[data-role=edit]", row).addEventListener("click", () => editChapter(i));
    const merge = $("[data-role=merge]", row);
    if (merge) merge.addEventListener("click", () => mergeChapter(i));
  });
}

function setAllChapters(value) {
  state.book.chapters.forEach((c) => (c.include = value));
  renderChapters();
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
      toast("Chapitre enregistré.");
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
  } catch (err) { toast(err.message, true); }
}

async function preview() {
  const s = currentSettings();
  const btn = $("#btn-preview");
  const audio = $("#preview-audio");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Synthèse…';
  try {
    const res = await api("/api/preview", {
      method: "POST",
      json: { engine: s.engine, voice: s.voice, speed: s.speed, tone: s.tone, text: $("#sample").value },
    });
    const blob = await res.blob();
    if (audio.src) URL.revokeObjectURL(audio.src);
    audio.src = URL.createObjectURL(blob);
    audio.hidden = false;
    audio.play().catch(() => { /* lecture auto bloquée : l'utilisateur appuie sur play */ });
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "▶ Écouter un extrait";
  }
}

async function startConversion() {
  const s = currentSettings();
  if (!s.formats.length) return toast("Choisissez au moins un format (MP3 ou M4B).", true);
  if (!s.voice) return toast("Choisissez une voix.", true);
  await saveChapters();
  const btn = $("#btn-convert");
  btn.disabled = true;
  try {
    const job = await api("/api/jobs", {
      method: "POST",
      json: { book_id: state.book.id, ...s, title: $("#book-title").value, author: $("#book-author").value },
    });
    location.hash = `#/job/${job.id}`;
  } catch (err) {
    toast(err.message, true);
    btn.disabled = false;
  }
}

/* ---------------------------------------------------------------- conversion */

async function showJob(id) {
  state.jobSignature = "";
  app.innerHTML = '<div class="empty"><span class="spinner" style="display:inline-block"></span></div>';
  await refreshJob(id, true);
}

async function refreshJob(id, first = false) {
  let job;
  try {
    job = await api(`/api/jobs/${id}`);
  } catch (err) {
    if (first) app.innerHTML = `<div class="notice err">${esc(err.message)}</div><a class="btn" href="#/">Retour</a>`;
    else state.pollTimer = setTimeout(() => refreshJob(id), 4000); // coupure réseau passagère
    return;
  }
  if (location.hash !== `#/job/${id}`) return;
  renderJob(job);
  if (job.status === "running" || job.status === "queued") {
    state.pollTimer = setTimeout(() => refreshJob(id), 1500);
  }
}

function renderJob(job) {
  document.title = `${Math.round(job.progress * 100)} % · ${job.title}`;
  const pct = (job.progress * 100).toFixed(1);
  const active = job.status === "running" || job.status === "queued";
  const resumable = ["error", "cancelled", "interrupted"].includes(job.status);
  const total = job.chapters.length;
  const s = job.settings;

  // Les lecteurs audio ne sont reconstruits que si quelque chose a changé
  // (sinon l'écoute serait coupée à chaque rafraîchissement).
  const signature = `${job.status}|${job.chapters_done}|${job.current_chapter}|${job.m4b}`;
  const rebuild = signature !== state.jobSignature || !$("#job-progress");
  state.jobSignature = signature;

  if (rebuild) {
    app.innerHTML = `
      <a href="#/" class="btn ghost small" style="margin-bottom:12px">← Accueil</a>
      <section class="card">
        <div class="card-head">
          <div>
            <h1 style="margin:0">${esc(job.title)}</h1>
            <div class="muted">${esc(job.author || "")}</div>
          </div>
          ${badge(job.status)}
        </div>
        <div class="job-progress" id="job-progress"></div>
        <div class="muted" style="font-size:.88rem;margin-top:10px">
          ${esc(s.engine === "edge" ? "Edge TTS" : s.engine)} · ${esc(s.voice)} · vitesse × ${Number(s.speed).toFixed(2)} · ${s.bitrate} kbps · ${esc(s.formats.join(" + ").toUpperCase())}
        </div>
        <div class="btn-row" style="margin-top:14px">
          ${active ? '<button class="btn danger" id="btn-cancel">Annuler</button>' : ""}
          ${resumable ? '<button class="btn primary" id="btn-resume">Reprendre</button>' : ""}
          ${!active ? '<button class="btn ghost danger" id="btn-delete">Supprimer</button>' : ""}
          <a class="btn ghost" href="#/book/${esc(job.book_id)}">Retour au livre</a>
        </div>
      </section>
      ${(job.m4b_url || job.zip_url) ? `
      <section class="card">
        <h2>Téléchargements</h2>
        <div class="downloads">
          ${job.m4b_url ? `<a class="btn primary" href="${esc(job.m4b_url)}" download>⬇ Livre audio M4B (avec chapitres)</a>` : ""}
          ${job.zip_url ? `<a class="btn" href="${esc(job.zip_url)}" download>⬇ Tous les MP3 (ZIP)</a>` : ""}
        </div>
      </section>` : ""}
      <section class="card">
        <h2>Chapitres</h2>
        <div id="tracks">${job.chapters.map((c) => trackHtml(job, c)).join("")}</div>
      </section>`;

    const cancel = $("#btn-cancel");
    if (cancel) cancel.addEventListener("click", async () => {
      try { renderJob(await api(`/api/jobs/${job.id}/cancel`, { method: "POST" })); } catch (err) { toast(err.message, true); }
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

  // Zone de progression : mise à jour à chaque rafraîchissement.
  const eta = job.eta_seconds ? `Temps restant ≈ ${fmtDuration(job.eta_seconds)}` : "";
  const chapterInfo = job.current_chapter ? `Chapitre ${job.current_chapter} / ${total}` : `${job.chapters_done} / ${total} chapitres`;
  $("#job-progress").innerHTML = `
    <div class="job-numbers">
      <span class="pct">${job.status === "done" ? "100" : Math.floor(job.progress * 100)} %</span>
      <span class="muted" style="align-self:flex-end">${esc(chapterInfo)}${eta ? " · " + esc(eta) : ""}</span>
    </div>
    <div class="progress"><div style="width:${job.status === "done" ? 100 : pct}%"></div></div>
    <div>${esc(job.message || "")}</div>
    ${job.error ? `<div class="notice err">${esc(job.error)}</div>` : ""}`;
}

function trackHtml(job, c) {
  let icon = '<span class="muted">•</span>';
  if (c.status === "done") icon = '<span style="color:var(--ok)">✓</span>';
  else if (job.status === "running" && job.current_chapter === c.number) icon = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block"></span>';
  const file = c.mp3 ? job.files.find((f) => f.name === c.mp3) : null;
  return `
    <div class="track">
      <div class="track-head">
        <span class="track-state">${icon}</span>
        <span class="grow">${c.number}. ${esc(c.title)}</span>
        ${c.duration ? `<span class="muted" style="font-size:.85rem">${fmtDuration(c.duration)}</span>` : ""}
        ${file ? `<a class="btn small ghost" href="${esc(file.url)}" download title="Télécharger le MP3">⬇</a>` : ""}
      </div>
      ${file ? `<audio controls preload="none" src="${esc(file.url)}"></audio>` : ""}
    </div>`;
}

/* ---------------------------------------------------------------- téléphone */

$("#btn-phone").addEventListener("click", async () => {
  const dlg = $("#dlg-phone");
  const box = $("#phone-content");
  box.innerHTML = '<div class="empty"><span class="spinner" style="display:inline-block"></span></div>';
  dlg.showModal();
  try {
    const info = await api("/api/server-info");
    if (info.lan && info.urls.length) {
      box.innerHTML = `
        <ol class="steps">
          <li>Connectez le téléphone au <strong>même Wi-Fi</strong> que cet ordinateur.</li>
          <li>Scannez ce QR code avec l'appareil photo.</li>
          <li>Dans le navigateur du téléphone : « Ajouter à l'écran d'accueil » pour l'avoir comme une application.</li>
        </ol>
        <div class="qr">${info.qr_svg}</div>
        <div class="url">${esc(info.urls[0])}</div>
        <p class="muted" style="font-size:.85rem">Ce lien contient une clé secrète : ne le partagez pas. L'ordinateur doit rester allumé pendant l'utilisation.</p>`;
    } else {
      box.innerHTML = `
        <p>L'accès depuis le téléphone n'est pas activé.</p>
        <p>Fermez l'application puis relancez-la avec <strong>Lancer-telephone.bat</strong> (ou <code>python run.py --lan</code>).</p>
        <p class="muted" style="font-size:.9rem">Au premier lancement, Windows demande l'autorisation du pare-feu : acceptez pour les <em>réseaux privés</em>.</p>`;
    }
  } catch (err) {
    box.innerHTML = `<div class="notice err">${esc(err.message)}</div>`;
  }
});

/* ---------------------------------------------------------------- divers */

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// Service worker : uniquement en contexte sécurisé (localhost ou HTTPS).
if ("serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker.register("sw.js").catch(() => { /* facultatif */ });
}

route();
