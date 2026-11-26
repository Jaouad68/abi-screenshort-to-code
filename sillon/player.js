// Sillon, lecteur : fichiers de l'utilisateur (IndexedDB) + titres sous licence libre (Openverse).
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (s) => {
    if (!Number.isFinite(s) || s < 0) return '–:––';
    s = Math.round(s);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
  };
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const store = {
    get(k, d) { try { const v = localStorage.getItem('sillon.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('sillon.' + k, JSON.stringify(v)); } catch { /* stockage indisponible */ } },
  };
  const COVERS = ['var(--plan-solo)', 'var(--plan-etudiant)', 'var(--plan-duo)', 'var(--plan-foyer)'];
  const coverColor = (id) => COVERS[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % COVERS.length];
  const coverHtml = (t, cls = '') => t?.cover
    ? `<div class="cover ${cls}"><img src="${esc(t.cover)}" alt="" loading="lazy" onerror="this.remove()"></div>`
    : `<div class="cover ${cls}" style="--cover-bg:${coverColor(t?.id || 'x')}"><svg aria-hidden="true"><use href="#p-logo"/></svg></div>`;

  /* ---------- Toast ---------- */
  const toastEl = $('[data-toast]');
  let toastTimer;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3500);
  };

  /* ---------- Bibliothèque locale (IndexedDB) ---------- */
  const DB = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((res, rej) => {
        let req;
        try { req = indexedDB.open('sillon', 1); } catch (e) { rej(e); return; }
        req.onupgradeneeded = () => req.result.createObjectStore('files', { keyPath: 'id' });
        req.onsuccess = () => { this.db = req.result; res(this.db); };
        req.onerror = () => rej(req.error);
      });
    },
    async tx(mode, fn) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const t = db.transaction('files', mode);
        const r = fn(t.objectStore('files'));
        t.oncomplete = () => res(r?.result);
        t.onerror = () => rej(t.error);
      });
    },
    all() { return this.tx('readonly', (s) => s.getAll()); },
    put(rec) { return this.tx('readwrite', (s) => s.put(rec)); },
    del(id) { return this.tx('readwrite', (s) => s.delete(id)); },
  };
  let local = []; // métadonnées des fichiers, sans le blob
  const blobs = new Map(); // id -> Blob
  const urls = new Map(); // id -> object URL

  const parseName = (name) => {
    const base = name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim();
    const m = base.match(/^(?:\d+[\s.-]+)?(.+?)\s+-\s+(.+)$/);
    return m ? { artist: m[1].trim(), title: m[2].trim() } : { artist: 'Fichier local', title: base || name };
  };
  const probeDuration = (blob) => new Promise((res) => {
    const a = new Audio();
    const u = URL.createObjectURL(blob);
    const done = (d) => { URL.revokeObjectURL(u); res(d); };
    a.preload = 'metadata';
    a.onloadedmetadata = () => done(Number.isFinite(a.duration) ? a.duration : null);
    a.onerror = () => done(undefined);
    a.src = u;
  });
  async function loadLocal() {
    try {
      const recs = await DB.all();
      local = recs.map(({ blob, ...meta }) => { blobs.set(meta.id, blob); return meta; });
      local.sort((a, b) => a.added - b.added);
    } catch {
      local = [];
    }
  }
  async function addFiles(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith('audio/') || /\.(mp3|m4a|aac|ogg|oga|opus|flac|wav|webm)$/i.test(f.name));
    if (!files.length) { toast("Aucun fichier audio reconnu dans cette sélection."); return; }
    let added = 0, unreadable = 0;
    for (const f of files) {
      const duration = await probeDuration(f);
      if (duration === undefined) { unreadable++; continue; }
      const { artist, title } = parseName(f.name);
      const rec = { id: 'loc-' + uid(), kind: 'local', title, artist, duration, size: f.size, name: f.name, added: Date.now() };
      try { await DB.put({ ...rec, blob: f }); } catch { /* stockage refusé : gardé pour la session */ }
      blobs.set(rec.id, f);
      local.push(rec);
      added++;
    }
    const msg = [`${added} titre${added > 1 ? 's' : ''} ajouté${added > 1 ? 's' : ''}`];
    if (unreadable) msg.push(`${unreadable} illisible${unreadable > 1 ? 's' : ''} par ce navigateur`);
    toast(msg.join(', ') + '.');
    render();
  }
  async function removeLocal(id) {
    local = local.filter((t) => t.id !== id);
    blobs.delete(id);
    if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); }
    try { await DB.del(id); } catch { /* rien */ }
    playlists.forEach((p) => { p.tracks = p.tracks.filter((t) => t.id !== id); });
    savePlaylists();
    delete favs[id]; store.set('favs', favs);
    toast('Titre retiré de votre musique.');
    render();
  }
  const srcOf = (t) => {
    if (t.kind !== 'local') return t.src;
    const blob = blobs.get(t.id);
    if (!blob) return null;
    if (!urls.has(t.id)) urls.set(t.id, URL.createObjectURL(blob));
    return urls.get(t.id);
  };

  /* ---------- Catalogue libre (Openverse) ---------- */
  const API = 'https://api.openverse.org/v1/audio/';
  const LICENSES = { by: 'CC BY', 'by-sa': 'CC BY-SA', 'by-nd': 'CC BY-ND', cc0: 'CC0', pdm: 'Domaine public' };
  const SOURCES = { jamendo: 'Jamendo', freesound: 'Freesound', ccmixter: 'ccMixter', wikimedia_audio: 'Wikimedia', europeana: 'Europeana' };
  const toTrack = (r) => ({
    id: 'ov-' + r.id,
    kind: 'remote',
    title: r.title || 'Sans titre',
    artist: r.creator || 'Artiste inconnu',
    duration: r.duration ? r.duration / 1000 : null,
    src: r.url,
    cover: r.thumbnail || null,
    license: (LICENSES[r.license] || ('CC ' + String(r.license || '').toUpperCase())) + (r.license_version && r.license !== 'cc0' && r.license !== 'pdm' ? ' ' + r.license_version : ''),
    licenseUrl: r.license_url || null,
    landing: r.foreign_landing_url || null,
    source: SOURCES[r.source] || r.source || 'Openverse',
  });
  // Cache mémoire + navigateur (12 h) : l'API publique limite les appels anonymes.
  const cache = new Map();
  const TTL = 12 * 3600 * 1000;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function searchFree(q, size = 20) {
    const key = q.toLowerCase() + '|' + size;
    if (cache.has(key)) return cache.get(key);
    try {
      const s = JSON.parse(localStorage.getItem('sillon.q.' + key) || 'null');
      if (s && Date.now() - s.at < TTL) { cache.set(key, s.tracks); return s.tracks; }
    } catch { /* rien */ }
    const params = new URLSearchParams({ q, license_type: 'commercial', page_size: String(size), mature: 'false' });
    let res;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        res = await fetch(API + '?' + params, { headers: { Accept: 'application/json' } });
      } catch {
        throw new Error('Impossible de joindre le catalogue libre. Vérifiez votre connexion.');
      }
      if (res.status !== 429) break;
      const retry = Number(res.headers.get('Retry-After'));
      if (retry > 60) throw new Error('Le quota du catalogue libre est atteint pour aujourd\'hui. Votre musique reste disponible.');
      await sleep(Math.min(retry || 2 * (attempt + 1), 8) * 1000);
    }
    if (res.status === 429) throw new Error('Le catalogue libre reçoit trop de demandes. Réessayez dans une minute.');
    if (!res.ok) throw new Error('Le catalogue libre ne répond pas pour le moment.');
    const data = await res.json();
    const tracks = (data.results || []).filter((r) => r.url && /^https:/.test(r.url)).map(toTrack);
    cache.set(key, tracks);
    try { localStorage.setItem('sillon.q.' + key, JSON.stringify({ at: Date.now(), tracks })); } catch { /* stockage plein */ }
    return tracks;
  }
  // Une requête après l'autre, pour ne pas déclencher la limite de débit.
  async function searchMany(qs, size) {
    const out = [];
    for (const q of qs) {
      try { out.push({ status: 'fulfilled', value: await searchFree(q, size) }); }
      catch (e) { out.push({ status: 'rejected', reason: e }); }
    }
    return out;
  }

  /* ---------- Favoris et playlists ---------- */
  let favs = store.get('favs', {}); // id -> track
  let playlists = store.get('playlists', []); // [{id, name, tracks}]
  const savePlaylists = () => { store.set('playlists', playlists); renderPlaylistNav(); };
  const isFav = (id) => Object.hasOwn(favs, id);
  function toggleFav(t) {
    if (isFav(t.id)) { delete favs[t.id]; toast('Retiré des titres aimés.'); }
    else { favs[t.id] = slim(t); toast('Ajouté aux titres aimés.'); }
    store.set('favs', favs);
    syncNowLike();
    render(false);
  }
  const slim = (t) => { const { ...copy } = t; return copy; };
  // Un titre local enregistré dans une playlist n'est lisible que s'il est encore dans « Ma musique ».
  const resolve = (t) => (t.kind === 'local' ? local.find((l) => l.id === t.id) || null : t);

  /* ---------- Lecture ---------- */
  const audio = $('[data-audio]');
  const P = {
    queue: store.get('queue', []),
    order: [],
    pos: -1,
    shuffle: store.get('shuffle', false),
    repeat: store.get('repeat', 'off'),
    errors: 0,
  };
  const current = () => (P.pos >= 0 ? P.queue[P.order[P.pos]] : null);
  function buildOrder(startIdx) {
    const idx = P.queue.map((_, i) => i);
    if (P.shuffle) {
      for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
      if (startIdx != null) { idx.splice(idx.indexOf(startIdx), 1); idx.unshift(startIdx); }
    }
    P.order = idx;
    P.pos = startIdx == null ? -1 : P.order.indexOf(startIdx);
  }
  function playList(list, i) {
    const playable = list.map(resolve).filter(Boolean);
    if (!playable.length) { toast('Aucun titre lisible dans cette liste.'); return; }
    const target = resolve(list[i]);
    P.queue = playable;
    buildOrder(Math.max(0, playable.findIndex((t) => t.id === target?.id)));
    P.errors = 0;
    store.set('queue', P.queue.map(slim));
    load(true);
  }
  function load(autoplay) {
    const t = current();
    if (!t) return;
    const src = srcOf(t);
    if (!src) { toast('Ce fichier n\'est plus dans « Ma musique ».'); next(true); return; }
    audio.src = src;
    if (autoplay) audio.play().catch(() => syncPlay());
    syncNow();
    render(false);
  }
  function next(auto) {
    if (!P.queue.length) return;
    if (auto && P.repeat === 'one') { audio.currentTime = 0; audio.play().catch(() => {}); return; }
    if (P.pos + 1 < P.order.length) { P.pos++; load(true); return; }
    if (P.repeat === 'all' || !auto) { if (P.shuffle) buildOrder(null); P.pos = 0; load(true); return; }
    audio.pause(); audio.currentTime = 0; syncPlay();
  }
  function prev() {
    if (!P.queue.length) return;
    if (audio.currentTime > 3 || P.pos <= 0) { audio.currentTime = 0; return; }
    P.pos--; load(true);
  }
  function toggle() {
    if (!current()) {
      const first = P.queue.length ? null : Object.values(favs);
      if (first && first.length) { playList(first, 0); return; }
      if (P.queue.length) { buildOrder(0); load(true); return; }
      toast('Choisissez un titre pour commencer.');
      return;
    }
    if (audio.paused) audio.play().catch(() => toast('Lecture impossible pour ce titre.'));
    else audio.pause();
  }

  audio.addEventListener('play', syncPlay);
  audio.addEventListener('pause', syncPlay);
  audio.addEventListener('ended', () => next(true));
  audio.addEventListener('playing', () => { P.errors = 0; });
  audio.addEventListener('loadedmetadata', syncTime);
  audio.addEventListener('timeupdate', syncTime);
  audio.addEventListener('error', () => {
    if (!audio.src || !current()) return;
    P.errors++;
    if (P.errors >= 3) { toast('Plusieurs titres n\'ont pas pu être lus. Vérifiez votre connexion.'); audio.pause(); syncPlay(); return; }
    toast('Ce titre ne peut pas être lu, passage au suivant.');
    next(false);
  });

  /* ---------- Barre de lecture ---------- */
  const seek = $('[data-seek]'), vol = $('[data-volume]');
  let seeking = false;
  function syncTime() {
    const d = Number.isFinite(audio.duration) ? audio.duration : (current()?.duration || 0);
    if (!seeking) seek.value = String(Math.floor(audio.currentTime));
    seek.max = String(Math.floor(d));
    const pct = d ? (audio.currentTime / d) * 100 : 0;
    seek.style.setProperty('--fill', pct + '%');
    document.body.style.setProperty('--progress', pct + '%');
    $('[data-time-cur]').textContent = fmt(audio.currentTime);
    $('[data-time-dur]').textContent = fmt(d);
    if ('mediaSession' in navigator && d && navigator.mediaSession.setPositionState) {
      try { navigator.mediaSession.setPositionState({ duration: d, position: Math.min(audio.currentTime, d), playbackRate: audio.playbackRate }); } catch { /* rien */ }
    }
  }
  seek.addEventListener('input', () => { seeking = true; $('[data-time-cur]').textContent = fmt(+seek.value); seek.style.setProperty('--fill', (seek.max > 0 ? (seek.value / seek.max) * 100 : 0) + '%'); });
  seek.addEventListener('change', () => { audio.currentTime = +seek.value; seeking = false; });
  const setVol = (v) => { audio.volume = v; vol.value = String(v); vol.style.setProperty('--fill', v * 100 + '%'); store.set('vol', v); syncMute(); };
  vol.addEventListener('input', () => { audio.muted = false; setVol(+vol.value); });
  $('[data-mute]').addEventListener('click', () => { audio.muted = !audio.muted; syncMute(); });
  function syncMute() {
    const muted = audio.muted || audio.volume === 0;
    const b = $('[data-mute]');
    b.setAttribute('aria-label', muted ? 'Rétablir le son' : 'Couper le son');
    b.querySelector('use').setAttribute('href', muted ? '#p-mute' : '#p-vol');
  }
  function syncPlay() {
    const playing = !audio.paused;
    const b = $('[data-toggle]');
    b.setAttribute('aria-label', playing ? 'Pause' : 'Lecture');
    b.querySelector('use').setAttribute('href', playing ? '#p-pause' : '#p-play');
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    document.title = playing && current() ? `${current().title} · ${current().artist}` : 'Sillon : écouter';
  }
  function syncNow() {
    const t = current();
    $('[data-now-title]').textContent = t ? t.title : 'Rien en lecture';
    $('[data-now-artist]').textContent = t ? t.artist : 'Choisissez un titre pour commencer';
    $('[data-now-cover]').outerHTML = t ? coverHtml(t, 'cover--sm').replace('class="cover', 'data-now-cover class="cover') : '<div class="cover cover--sm" data-now-cover></div>';
    syncNowLike();
    if ('mediaSession' in navigator && t) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: 'Sillon', artwork: t.cover ? [{ src: t.cover }] : [] });
    }
  }
  function syncNowLike() {
    const t = current(), b = $('[data-now-like]');
    b.disabled = !t;
    const on = !!t && isFav(t.id);
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? 'Retirer des titres aimés' : 'Ajouter aux titres aimés');
    b.querySelector('use').setAttribute('href', on ? '#p-heart-on' : '#p-heart');
  }
  function syncModes() {
    const s = $('[data-shuffle]');
    s.setAttribute('aria-pressed', String(P.shuffle));
    const r = $('[data-repeat]');
    r.dataset.mode = P.repeat;
    r.setAttribute('aria-label', { off: 'Répéter : désactivé', all: 'Répéter : toute la file', one: 'Répéter : ce titre' }[P.repeat]);
  }
  $('[data-toggle]').addEventListener('click', toggle);
  $('[data-next]').addEventListener('click', () => next(false));
  $('[data-prev]').addEventListener('click', prev);
  $('[data-now-like]').addEventListener('click', () => current() && toggleFav(current()));
  $('[data-shuffle]').addEventListener('click', () => {
    P.shuffle = !P.shuffle; store.set('shuffle', P.shuffle);
    const cur = P.order[P.pos]; buildOrder(cur ?? null); if (cur == null) P.pos = -1;
    syncModes(); toast(P.shuffle ? 'Lecture aléatoire activée.' : 'Lecture aléatoire désactivée.');
    if (route().name === 'file') render(false);
  });
  $('[data-repeat]').addEventListener('click', () => {
    P.repeat = { off: 'all', all: 'one', one: 'off' }[P.repeat]; store.set('repeat', P.repeat); syncModes();
  });
  if ('mediaSession' in navigator) {
    const h = { play: toggle, pause: toggle, previoustrack: prev, nexttrack: () => next(false), seekto: (e) => { audio.currentTime = e.seekTime; } };
    for (const [k, fn] of Object.entries(h)) { try { navigator.mediaSession.setActionHandler(k, fn); } catch { /* non pris en charge */ } }
  }
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select, [contenteditable], dialog')) return;
    if (e.code === 'Space' && !e.target.closest('button, a')) { e.preventDefault(); toggle(); }
    else if (e.shiftKey && e.key === 'ArrowRight') { e.preventDefault(); next(false); }
    else if (e.shiftKey && e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    else if (e.key === 'ArrowRight' && current()) { audio.currentTime = Math.min(audio.currentTime + 5, audio.duration || audio.currentTime); }
    else if (e.key === 'ArrowLeft' && current()) { audio.currentTime = Math.max(audio.currentTime - 5, 0); }
  });

  /* ---------- Rendu des listes ---------- */
  const lists = new Map(); // nom de liste -> tracks affichés
  function trackRows(listName, tracks, opts = {}) {
    lists.set(listName, tracks);
    const cur = current();
    return `<ol class="tracks">${tracks.map((t, i) => {
      const ok = resolve(t);
      const fav = isFav(t.id);
      return `<li class="track${cur && cur.id === t.id ? ' is-current' : ''}">
        <div class="track__num"><span>${i + 1}</span><button class="icon-btn" type="button" data-play="${esc(listName)}" data-i="${i}" aria-label="Lire ${esc(t.title)}"${ok ? '' : ' disabled'}><svg aria-hidden="true"><use href="#p-play"/></svg></button></div>
        ${coverHtml(t, 'cover--row')}
        <button class="track__main" type="button" data-play="${esc(listName)}" data-i="${i}"${ok ? '' : ' disabled'}>
          <p class="track__title">${esc(t.title)}</p>
          <p class="track__sub">${esc(t.artist)}${t.kind === 'remote' ? ' · ' + esc(t.license) : ok ? ' · Fichier local' : ' · Fichier retiré'}</p>
        </button>
        <div class="track__end">
          <span class="track__dur">${fmt(t.duration)}</span>
          <button class="icon-btn" type="button" data-fav="${esc(listName)}" data-i="${i}" aria-pressed="${fav}" aria-label="${fav ? 'Retirer des titres aimés' : 'Ajouter aux titres aimés'}"><svg aria-hidden="true"><use href="#p-heart${fav ? '-on' : ''}"/></svg></button>
          <button class="icon-btn" type="button" data-add="${esc(listName)}" data-i="${i}" aria-label="Ajouter ${esc(t.title)} à une playlist"><svg aria-hidden="true"><use href="#p-plus"/></svg></button>
          ${t.kind === 'remote' ? `<button class="icon-btn" type="button" data-info="${esc(listName)}" data-i="${i}" aria-label="Licence et source de ${esc(t.title)}"><svg aria-hidden="true"><use href="#p-info"/></svg></button>` : ''}
          ${opts.remove ? `<button class="icon-btn" type="button" data-remove="${esc(listName)}" data-i="${i}" aria-label="${esc(opts.remove)} : ${esc(t.title)}"><svg aria-hidden="true"><use href="#p-trash"/></svg></button>` : ''}
        </div>
      </li>`;
    }).join('')}</ol>`;
  }
  function cardRow(listName, tracks) {
    lists.set(listName, tracks);
    return `<div class="cards">${tracks.map((t, i) => `<button class="card" type="button" data-play="${esc(listName)}" data-i="${i}" aria-label="Lire ${esc(t.title)}, ${esc(t.artist)}">
      <div class="card__cover">${coverHtml(t)}<span class="play-hint" aria-hidden="true"><svg><use href="#p-play"/></svg></span></div>
      <span class="card__title">${esc(t.title)}</span><span class="card__artist">${esc(t.artist)}</span></button>`).join('')}</div>`;
  }
  const emptyState = (title, body, action = '') => `<div class="state"><strong>${esc(title)}</strong><p>${esc(body)}</p>${action}</div>`;
  const skeleton = () => `<div class="skeleton" aria-hidden="true">${'<div></div>'.repeat(8)}</div>`;

  /* ---------- Vues ---------- */
  const view = $('#vue');
  const GENRES = [['Jazz', 'jazz'], ['Piano', 'piano'], ['Électro', 'electronic'], ['Ambient', 'ambient'], ['Rock', 'rock'], ['Hip-hop', 'hip hop'], ['Folk', 'folk'], ['Classique', 'classical'], ['Lo-fi', 'lofi']];
  const SHELVES = [['Jazz du soir', 'jazz'], ['Piano au calme', 'piano'], ['Électro pour avancer', 'electronic'], ['Guitares', 'rock']];
  let searchQ = store.get('lastSearch', '');
  let genre = null;

  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (h.startsWith('playlist-')) return { name: 'playlist', id: h.slice(9) };
    return { name: ['decouvrir', 'recherche', 'ma-musique', 'favoris', 'file', 'bibliotheque'].includes(h) ? h : 'decouvrir' };
  }
  function markNav() {
    const r = route();
    const key = r.name === 'playlist' ? 'playlist-' + r.id : r.name;
    $$('[data-route]').forEach((a) => a.toggleAttribute('aria-current', a.dataset.route === key || (key.startsWith('playlist-') && a.dataset.route === 'bibliotheque')));
    $$('[data-route][aria-current]').forEach((a) => a.setAttribute('aria-current', 'page'));
    $$('[data-playlist-nav] a').forEach((a) => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + key));
    $$('[data-playlist-nav] a[aria-current]').forEach((a) => a.setAttribute('aria-current', 'page'));
  }

  let renderId = 0;
  async function render(scrollTop = true) {
    const r = route();
    const id = ++renderId;
    markNav();
    if (r.name === 'decouvrir') await vDiscover(id);
    else if (r.name === 'recherche') await vSearch(id);
    else if (r.name === 'ma-musique') vLocal();
    else if (r.name === 'favoris') vFavs();
    else if (r.name === 'file') vQueue();
    else if (r.name === 'bibliotheque') vLibrary();
    else if (r.name === 'playlist') vPlaylist(r.id);
    if (scrollTop) window.scrollTo(0, 0);
  }

  async function vDiscover(id) {
    const head = `<div class="view__head"><div><h1>Découvrir</h1><p>Des titres sous licence Creative Commons, libres d'écoute et de partage, réunis par Openverse.</p></div></div>
      <div class="chips" role="group" aria-label="Genres">${GENRES.map(([l, q]) => `<button class="chip" type="button" data-genre="${esc(q)}" aria-pressed="${genre === q}">${esc(l)}</button>`).join('')}</div>`;
    const shelves = genre ? [[GENRES.find((g) => g[1] === genre)?.[0] || genre, genre]] : SHELVES;
    view.innerHTML = head + shelves.map(([t]) => `<section class="shelf"><div class="shelf__head"><h2>${esc(t)}</h2></div>${skeleton()}</section>`).join('');
    const results = await searchMany(shelves.map(([, q]) => q), genre ? 30 : 12);
    if (id !== renderId) return;
    view.innerHTML = head + shelves.map(([t, q], i) => {
      const res = results[i];
      if (res.status === 'rejected') return `<section class="shelf"><div class="shelf__head"><h2>${esc(t)}</h2></div>${emptyState('Catalogue indisponible', res.reason?.message || 'Réessayez dans un instant.', '<button class="btn btn--sm btn--ghost" type="button" data-retry>Réessayer</button>')}</section>`;
      if (!res.value.length) return '';
      return `<section class="shelf"><div class="shelf__head"><h2>${esc(t)}</h2><button class="link" type="button" data-play-all="d-${esc(q)}">Tout lire</button></div>${genre ? trackRows('d-' + q, res.value) : cardRow('d-' + q, res.value)}</section>`;
    }).join('');
  }

  async function vSearch(id) {
    const form = `<div class="view__head"><div><h1>Rechercher</h1><p>Un artiste, un style, une ambiance : la recherche couvre votre musique et le catalogue libre.</p></div></div>
      <form class="search" role="search" data-search-form><label class="visually-hidden" for="q">Rechercher</label><input id="q" type="search" name="q" value="${esc(searchQ)}" placeholder="Ex. piano, bossa nova, pluie…" autocomplete="off"><button class="btn" type="submit">Rechercher</button></form>`;
    if (!searchQ) { view.innerHTML = form + emptyState('Que voulez-vous écouter ?', 'Tapez un mot puis Entrée. Les titres du catalogue libre peuvent être écoutés, aimés et ajoutés à vos playlists.'); return; }
    const q = searchQ.toLowerCase();
    const mine = local.filter((t) => (t.title + ' ' + t.artist).toLowerCase().includes(q));
    view.innerHTML = form + (mine.length ? `<section class="shelf"><div class="shelf__head"><h2>Dans votre musique</h2></div>${trackRows('s-local', mine)}</section>` : '') + `<section class="shelf"><div class="shelf__head"><h2>Catalogue libre</h2></div>${skeleton()}</section>`;
    let res, err;
    try { res = await searchFree(searchQ, 30); } catch (e) { err = e; }
    if (id !== renderId) return;
    const free = err ? emptyState('Catalogue indisponible', err.message, '<button class="btn btn--sm btn--ghost" type="button" data-retry>Réessayer</button>')
      : res.length ? `<div class="shelf__head"><h2>Catalogue libre</h2><button class="link" type="button" data-play-all="s-free">Tout lire</button></div>${trackRows('s-free', res)}`
      : emptyState('Aucun résultat', `Rien trouvé pour « ${searchQ} ». Essayez un genre ou un mot en anglais.`);
    view.innerHTML = form + (mine.length ? `<section class="shelf"><div class="shelf__head"><h2>Dans votre musique</h2></div>${trackRows('s-local', mine)}</section>` : '') + `<section class="shelf">${free}</section>`;
  }

  function vLocal() {
    const total = local.reduce((a, t) => a + (t.duration || 0), 0);
    view.innerHTML = `<div class="view__head"><div><h1>Ma musique</h1><p>Vos fichiers restent sur cet appareil, dans ce navigateur. Rien n'est envoyé sur Internet.</p></div>
      <div class="view__actions">${local.length ? `<button class="btn" type="button" data-play-all="local">Tout lire</button>` : ''}<label class="btn btn--ghost" for="files">Ajouter des fichiers</label><input class="visually-hidden" id="files" type="file" accept="audio/*,.mp3,.m4a,.flac,.ogg,.opus,.wav" multiple data-files></div></div>
      <div class="drop" data-drop><strong>Glissez vos fichiers audio ici</strong><span>MP3, AAC, FLAC, OGG, WAV… selon ce que lit votre navigateur. Nommez-les « Artiste - Titre » pour un affichage propre.</span></div>
      ${local.length ? `<p class="fine" style="margin-bottom:var(--s-3)">${local.length} titre${local.length > 1 ? 's' : ''} · ${fmt(total)}</p>${trackRows('local', local, { remove: 'Retirer de ma musique' })}`
      : emptyState('Votre musique est vide', 'Ajoutez des fichiers depuis votre ordinateur ou votre téléphone pour les écouter ici, mélangés au catalogue libre.')}`;
  }

  function vFavs() {
    const list = Object.values(favs);
    view.innerHTML = `<div class="view__head"><div><h1>Titres aimés</h1><p>${list.length} titre${list.length > 1 ? 's' : ''}</p></div>${list.length ? '<div class="view__actions"><button class="btn" type="button" data-play-all="favs">Tout lire</button></div>' : ''}</div>
      ${list.length ? trackRows('favs', list) : emptyState('Aucun titre aimé', 'Touchez le cœur à côté d\'un titre pour le retrouver ici.', '<a class="btn btn--sm btn--ghost" href="#decouvrir">Découvrir des titres</a>')}`;
  }

  function vQueue() {
    const order = P.order.map((i) => P.queue[i]);
    const upcoming = order.slice(P.pos + 1);
    const cur = current();
    view.innerHTML = `<div class="view__head"><div><h1>File d'attente</h1><p>${P.shuffle ? 'Lecture aléatoire' : 'Dans l\'ordre'}${P.repeat !== 'off' ? ' · répétition ' + (P.repeat === 'one' ? 'du titre' : 'de la file') : ''}</p></div>${order.length ? '<div class="view__actions"><button class="btn btn--sm btn--ghost" type="button" data-clear-queue>Vider la file</button></div>' : ''}</div>
      ${cur ? `<section class="shelf"><div class="shelf__head"><h2>En cours</h2></div>${trackRows('q-now', [cur])}</section>` : ''}
      ${upcoming.length ? `<section class="shelf"><div class="shelf__head"><h2>À suivre</h2></div>${trackRows('q-next', upcoming)}</section>` : emptyState('Rien à suivre', cur ? 'La lecture s\'arrêtera après ce titre, sauf si la répétition est activée.' : 'Lancez un titre, un album ou une playlist pour remplir la file.')}`;
  }

  function vLibrary() {
    view.innerHTML = `<div class="view__head"><div><h1>Playlists</h1></div><div class="view__actions"><button class="btn" type="button" data-new-playlist>Nouvelle playlist</button></div></div>
      <ul class="tracks">
        <li class="track"><div class="track__num"></div><div class="cover cover--row" style="--cover-bg:var(--accent)"><svg aria-hidden="true"><use href="#p-heart-on"/></svg></div><a class="track__main" href="#favoris" style="text-decoration:none"><p class="track__title">Titres aimés</p><p class="track__sub">${Object.keys(favs).length} titres</p></a><div class="track__end"></div></li>
        ${playlists.map((p) => `<li class="track"><div class="track__num"></div>${coverHtml({ id: p.id, cover: p.tracks.find((t) => t.cover)?.cover }, 'cover--row')}<a class="track__main" href="#playlist-${esc(p.id)}" style="text-decoration:none"><p class="track__title">${esc(p.name)}</p><p class="track__sub">${p.tracks.length} titre${p.tracks.length > 1 ? 's' : ''}</p></a><div class="track__end"></div></li>`).join('')}
      </ul>
      ${playlists.length ? '' : `<p class="fine" style="margin-top:var(--s-4)">Créez une playlist puis ajoutez-y des titres avec le bouton +.</p>`}`;
  }

  function vPlaylist(pid) {
    const p = playlists.find((x) => x.id === pid);
    if (!p) { view.innerHTML = emptyState('Playlist introuvable', 'Elle a peut-être été supprimée.', '<a class="btn btn--sm btn--ghost" href="#bibliotheque">Voir les playlists</a>'); return; }
    const total = p.tracks.reduce((a, t) => a + (t.duration || 0), 0);
    view.innerHTML = `<div class="view__head"><div><h1>${esc(p.name)}</h1><p>${p.tracks.length} titre${p.tracks.length > 1 ? 's' : ''} · ${fmt(total)}</p></div>
      <div class="view__actions">${p.tracks.length ? '<button class="btn" type="button" data-play-all="pl">Lire</button>' : ''}<button class="btn btn--sm btn--ghost" type="button" data-rename="${esc(p.id)}">Renommer</button><button class="btn btn--sm btn--ghost" type="button" data-delete-pl="${esc(p.id)}">Supprimer</button></div></div>
      ${p.tracks.length ? trackRows('pl', p.tracks, { remove: 'Retirer de la playlist' }) : emptyState('Playlist vide', 'Ajoutez des titres depuis Découvrir, la recherche ou votre musique avec le bouton +.', '<a class="btn btn--sm btn--ghost" href="#decouvrir">Trouver des titres</a>')}`;
    view.dataset.pl = p.id;
  }

  function renderPlaylistNav() {
    const nav = $('[data-playlist-nav]');
    nav.innerHTML = playlists.length
      ? playlists.map((p) => `<li><a href="#playlist-${esc(p.id)}">${esc(p.name)}</a></li>`).join('')
      : '<li class="side__empty">Aucune playlist pour l\'instant.</li>';
    markNav();
  }

  /* ---------- Dialogues ---------- */
  const dAdd = $('[data-dialog-add]'), dInfo = $('[data-dialog-info]'), dName = $('[data-dialog-name]');
  let addTarget = null;
  function openAdd(t) {
    addTarget = t;
    $('[data-add-track]').textContent = `${t.title} · ${t.artist}`;
    $('[data-add-list]').innerHTML = playlists.length
      ? playlists.map((p) => `<li><button type="button" data-add-to="${esc(p.id)}">${esc(p.name)} <span class="track__sub">(${p.tracks.length})</span></button></li>`).join('')
      : '<li class="sheet__sub">Aucune playlist : créez-en une ci-dessous.</li>';
    $('[data-add-new]').value = '';
    dAdd.showModal();
  }
  function addTo(p, t) {
    if (p.tracks.some((x) => x.id === t.id)) { toast(`Déjà dans « ${p.name} ».`); return; }
    p.tracks.push(slim(t)); savePlaylists(); toast(`Ajouté à « ${p.name} ».`);
    if (route().name === 'playlist' && route().id === p.id) render(false);
  }
  $('[data-add-list]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-add-to]'); if (!b || !addTarget) return;
    const p = playlists.find((x) => x.id === b.dataset.addTo); if (p) addTo(p, addTarget);
    dAdd.close();
  });
  $('[data-add-create]').addEventListener('click', () => {
    const name = $('[data-add-new]').value.trim();
    if (!name) { $('[data-add-new]').focus(); return; }
    const p = { id: uid(), name, tracks: [] }; playlists.push(p); addTo(p, addTarget); dAdd.close();
  });
  function openInfo(t) {
    $('[data-info-body]').innerHTML = `<dl class="credit">
      <dt>Titre</dt><dd>${esc(t.title)}</dd><dt>Artiste</dt><dd>${esc(t.artist)}</dd>
      <dt>Licence</dt><dd>${t.licenseUrl ? `<a href="${esc(t.licenseUrl)}" target="_blank" rel="noopener">${esc(t.license)}</a>` : esc(t.license)}</dd>
      <dt>Source</dt><dd>${t.landing ? `<a href="${esc(t.landing)}" target="_blank" rel="noopener">${esc(t.source)}</a>` : esc(t.source)}, via Openverse</dd>
      <dt>Crédit à reprendre si vous partagez</dt><dd>« ${esc(t.title)} » par ${esc(t.artist)}, sous licence ${esc(t.license)}.</dd></dl>`;
    dInfo.showModal();
  }
  let nameCb = null;
  function askName(title, value, cb) {
    $('[data-name-title]').textContent = title;
    $('[data-name-input]').value = value || '';
    nameCb = cb; dName.showModal();
  }
  dName.addEventListener('close', () => {
    const v = $('[data-name-input]').value.trim();
    if (dName.returnValue === 'ok' && v && nameCb) nameCb(v);
    nameCb = null;
  });

  /* ---------- Événements délégués ---------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-play],[data-fav],[data-add],[data-info],[data-remove],[data-play-all],[data-genre],[data-retry],[data-new-playlist],[data-rename],[data-delete-pl],[data-clear-queue]');
    if (!el) return;
    const list = (name) => lists.get(name) || [];
    const ds = el.dataset;
    if (ds.play != null && !el.disabled) {
      const l = list(ds.play), i = +ds.i;
      if (ds.play === 'q-now') { toggle(); return; }
      if (ds.play === 'q-next') { P.pos = P.pos + 1 + i; load(true); return; }
      const cur = current();
      if (cur && l[i] && cur.id === l[i].id) { toggle(); return; }
      playList(l, i);
    } else if (ds.fav != null) toggleFav(list(ds.fav)[+ds.i]);
    else if (ds.add != null) openAdd(list(ds.add)[+ds.i]);
    else if (ds.info != null) openInfo(list(ds.info)[+ds.i]);
    else if (ds.remove != null) {
      const t = list(ds.remove)[+ds.i];
      if (ds.remove === 'local') removeLocal(t.id);
      else if (ds.remove === 'pl') { const p = playlists.find((x) => x.id === view.dataset.pl); if (p) { p.tracks = p.tracks.filter((x) => x.id !== t.id); savePlaylists(); toast('Retiré de la playlist.'); render(false); } }
    } else if (ds.playAll != null) playList(list(ds.playAll), 0);
    else if (ds.genre != null) { genre = genre === ds.genre ? null : ds.genre; render(false); }
    else if (ds.retry != null) { cache.clear(); render(false); }
    else if (ds.newPlaylist != null) askName('Nouvelle playlist', '', (name) => { const p = { id: uid(), name, tracks: [] }; playlists.push(p); savePlaylists(); location.hash = 'playlist-' + p.id; });
    else if (ds.rename != null) { const p = playlists.find((x) => x.id === ds.rename); if (p) askName('Renommer la playlist', p.name, (name) => { p.name = name; savePlaylists(); render(false); }); }
    else if (ds.deletePl != null) {
      const p = playlists.find((x) => x.id === ds.deletePl);
      if (p) { const backup = playlists.slice(); playlists = playlists.filter((x) => x.id !== p.id); savePlaylists(); location.hash = 'bibliotheque'; undoable(`« ${p.name} » supprimée.`, () => { playlists = backup; savePlaylists(); render(false); }); }
    } else if (ds.clearQueue != null) {
      const cur = current();
      P.queue = cur ? [cur] : []; buildOrder(cur ? 0 : null); store.set('queue', P.queue.map(slim)); render(false); toast('File vidée.');
    }
  });
  function undoable(msg, undo) {
    toastEl.innerHTML = `${esc(msg)} <button type="button" class="link" style="color:inherit;background:none;border:0;cursor:pointer;font:inherit;text-decoration:underline">Annuler</button>`;
    toastEl.hidden = false;
    toastEl.querySelector('button').onclick = () => { undo(); toastEl.hidden = true; };
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.hidden = true; }, 6000);
  }
  document.addEventListener('submit', (e) => {
    if (!e.target.matches('[data-search-form]')) return;
    e.preventDefault();
    searchQ = new FormData(e.target).get('q').toString().trim().slice(0, 100);
    store.set('lastSearch', searchQ);
    render(false);
  });
  document.addEventListener('change', (e) => { if (e.target.matches('[data-files]')) { addFiles(e.target.files); e.target.value = ''; } });
  ['dragenter', 'dragover'].forEach((ev) => document.addEventListener(ev, (e) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault(); $('[data-drop]')?.classList.add('is-over');
  }));
  ['dragleave', 'drop'].forEach((ev) => document.addEventListener(ev, (e) => {
    if (ev === 'dragleave' && e.relatedTarget) return;
    $('[data-drop]')?.classList.remove('is-over');
  }));
  document.addEventListener('drop', (e) => {
    if (!e.dataTransfer?.files?.length) return;
    e.preventDefault();
    addFiles(e.dataTransfer.files);
    if (route().name !== 'ma-musique') location.hash = 'ma-musique';
  });
  window.addEventListener('hashchange', () => { render(); view.focus({ preventScroll: true }); });

  /* ---------- Démarrage ---------- */
  (async () => {
    setVol(store.get('vol', 0.8));
    syncModes(); syncPlay(); renderPlaylistNav();
    await loadLocal();
    P.queue = P.queue.map(resolve).filter(Boolean);
    if (P.queue.length) { buildOrder(0); P.pos = -1; }
    syncNow();
    render();
  })();
})();
