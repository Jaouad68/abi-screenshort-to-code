/* Mercredi 75-87 — catalogue des dessins animés de la télé française (1975-1987).
   Aucun média n'est hébergé : les lecteurs sont des intégrations YouTube, Dailymotion ou INA. */
"use strict";

const DATA_URL = "data/dessins-animes.json";
// true quand l'hébergeur interdit les lecteurs intégrés : les génériques s'ouvrent alors dans YouTube.
const LIENS_SEULEMENT = false;
const CLE_FAVORIS = "mercredi.favoris";
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const LIBELLES_CHAMPS = { date: "date", chaine: "chaîne", emission: "émission", studio: "studio", pays: "pays" };

const etat = {
  items: [],
  parId: new Map(),
  favoris: new Set(),
  vueListe: "catalogue", // "catalogue" ou "favoris" : vue à retrouver en fermant une fiche
};

/* ---------- Utilitaires ---------- */
const $ = (sel, racine = document) => racine.querySelector(sel);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sansAccents = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const comparerFr = (a, b) => a.localeCompare(b, "fr", { sensitivity: "base" });

function formaterDate(date) {
  if (!date) return "";
  const [a, m, j] = String(date).split("-");
  if (j) return `${Number(j) === 1 ? "1er" : Number(j)} ${MOIS[Number(m) - 1]} ${a}`;
  if (m) return `${MOIS[Number(m) - 1]} ${a}`;
  return a;
}

function couleurValide(c, defaut) {
  return /^#[0-9a-f]{3,8}$/i.test(c || "") ? c : defaut;
}

function urlHttps(u) {
  try {
    const url = new URL(u);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

/* ---------- Favoris (stockés sur l'appareil) ---------- */
function chargerFavoris() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_FAVORIS) || "[]");
    if (Array.isArray(brut)) etat.favoris = new Set(brut);
  } catch {
    etat.favoris = new Set();
  }
}

function enregistrerFavoris() {
  try {
    localStorage.setItem(CLE_FAVORIS, JSON.stringify([...etat.favoris]));
  } catch {
    /* stockage indisponible (navigation privée) : les favoris restent en mémoire */
  }
}

function basculerFavori(id) {
  if (etat.favoris.has(id)) etat.favoris.delete(id);
  else etat.favoris.add(id);
  enregistrerFavoris();
  majCompteurFavoris();
  document.querySelectorAll(`.coeur[data-id="${CSS.escape(id)}"]`).forEach(majCoeur);
  if (etat.vueListe === "favoris" && routeActuelle().nom === "favoris") afficherGrille();
  if (!$("#vueJukebox").hidden) jukebox.reconstruire();
}

function majCoeur(bouton) {
  const actif = etat.favoris.has(bouton.dataset.id);
  bouton.setAttribute("aria-pressed", String(actif));
  bouton.textContent = actif ? "♥" : "♡";
  bouton.setAttribute("aria-label", `${actif ? "Retirer des" : "Ajouter aux"} favoris : ${bouton.dataset.titre}`);
}

function majCompteurFavoris() {
  $("#favCount").textContent = etat.favoris.size;
}

/* ---------- Sources vidéo légales ---------- */
function idYoutube(v) {
  if (!v) return "";
  if (/^[\w-]{11}$/.test(v)) return v;
  const m = String(v).match(/(?:[?&]v=|youtu\.be\/|\/embed\/|\/shorts\/)([\w-]{11})/);
  return m ? m[1] : "";
}

function idDailymotion(v) {
  if (!v) return "";
  if (/^[a-z0-9]{5,12}$/i.test(v)) return v;
  const m = String(v).match(/(?:dailymotion\.com\/(?:embed\/)?video\/|dai\.ly\/|[?&]video=)([a-z0-9]+)/i);
  return m ? m[1] : "";
}

/* Transforme une référence (source + identifiant ou URL) en lecteur intégrable et/ou lien. */
function media(source, valeur, titre) {
  if (source === "youtube") {
    const id = idYoutube(valeur);
    if (!id) return null;
    return { source, titre, youtubeId: id, embed: `https://www.youtube-nocookie.com/embed/${id}?rel=0&autoplay=1&playsinline=1`, lien: `https://www.youtube.com/watch?v=${id}` };
  }
  if (source === "dailymotion") {
    const id = idDailymotion(valeur);
    if (!id) return null;
    return { source, titre, embed: `https://www.dailymotion.com/embed/video/${id}?autoplay=1`, lien: `https://www.dailymotion.com/video/${id}` };
  }
  if (source === "ina") {
    const url = urlHttps(valeur);
    if (!url) return null;
    const host = new URL(url).hostname;
    if (host === "player.ina.fr") return { source, titre, embed: url, lien: "" };
    if (host === "ina.fr" || host.endsWith(".ina.fr")) return { source, titre, embed: "", lien: url };
  }
  return null;
}

function lecteursGenerique(item) {
  const g = item.generique || {};
  return [
    media("youtube", g.youtube, "YouTube"),
    media("dailymotion", g.dailymotion, "Dailymotion"),
    media("ina", g.ina, "INA"),
  ].filter(Boolean);
}

function extraits(item) {
  return (item.extraits || []).map((e) => media(e.source, e.id || e.url, e.titre || "Extrait")).filter(Boolean);
}

/* ---------- Données ---------- */
async function chargerDonnees() {
  const rep = await fetch(DATA_URL, { cache: "no-cache" });
  if (!rep.ok) throw new Error(`HTTP ${rep.status}`);
  const json = await rep.json();
  etat.items = (json.dessinsAnimes || [])
    .filter((d) => d && d.id && d.titre)
    .sort((a, b) => comparerFr(a.titre, b.titre));
  etat.items.forEach((d) => etat.parId.set(d.id, d));
  if (json.miseAJour) $("#maj").textContent = `Catalogue : ${etat.items.length} dessins animés, mis à jour le ${formaterDate(json.miseAJour)}.`;
}

/* ---------- Filtres ---------- */
const champs = {
  recherche: $("#recherche"),
  annee: $("#fAnnee"),
  chaine: $("#fChaine"),
  emission: $("#fEmission"),
  pays: $("#fPays"),
};

function remplirSelect(select, libelleTous, valeurs) {
  select.innerHTML = `<option value="">${esc(libelleTous)}</option>` +
    valeurs.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
}

function remplirFiltres() {
  const uniques = (f) => [...new Set(etat.items.flatMap(f).filter(Boolean))];
  remplirSelect(champs.annee, "Toutes", uniques((d) => [d.premiereDiffusion?.annee]).sort((a, b) => a - b).map(String));
  remplirSelect(champs.chaine, "Toutes", uniques((d) => [d.premiereDiffusion?.chaine]).sort(comparerFr));
  remplirSelect(champs.emission, "Toutes", uniques((d) => [d.premiereDiffusion?.emission]).sort(comparerFr));
  remplirSelect(champs.pays, "Tous", uniques((d) => d.pays || []).sort(comparerFr));
}

function resultats() {
  const q = sansAccents(champs.recherche.value.trim());
  const { annee, chaine, emission, pays } = {
    annee: champs.annee.value, chaine: champs.chaine.value, emission: champs.emission.value, pays: champs.pays.value,
  };
  const favorisSeuls = routeActuelle().nom === "favoris";
  return etat.items.filter((d) => {
    const p = d.premiereDiffusion || {};
    if (favorisSeuls && !etat.favoris.has(d.id)) return false;
    if (q && !sansAccents(`${d.titre} ${d.titreOriginal || ""}`).includes(q)) return false;
    if (annee && String(p.annee) !== annee) return false;
    if (chaine && p.chaine !== chaine) return false;
    if (emission && p.emission !== emission) return false;
    if (pays && !(d.pays || []).includes(pays)) return false;
    return true;
  });
}

/* ---------- Catalogue ---------- */
// Luminance relative approximative d'une couleur #rrggbb (0 = noir, 1 = blanc).
function luminance(hex) {
  const h = hex.length === 4 ? hex.replace(/^#(.)(.)(.)$/, "#$1$1$2$2$3$3") : hex;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function vignetteHTML(d) {
  let c1 = couleurValide(d.couleurs?.[0], "#3a2a8c");
  let c2 = couleurValide(d.couleurs?.[1], "#ff4f9a");
  // Le titre est blanc : la couleur la plus sombre sert de fond.
  if (luminance(c1) > luminance(c2)) [c1, c2] = [c2, c1];
  const img = urlHttps(d.image) || (d.image && !/^[a-z]+:/i.test(d.image) ? d.image : "");
  const annee = d.premiereDiffusion?.annee;
  return `<div class="vignette" style="--c1:${c1};--c2:${c2}">
      ${img ? `<img src="${esc(img)}" alt="" loading="lazy" />` : ""}
      ${img ? "" : `<span class="vignette-titre">${esc(d.titre)}</span>`}
      ${annee ? `<span class="vignette-annee">${esc(annee)}</span>` : ""}
    </div>`;
}

function carteHTML(d) {
  const p = d.premiereDiffusion || {};
  return `<article class="carte">
      <button class="coeur" type="button" data-id="${esc(d.id)}" data-titre="${esc(d.titre)}"></button>
      <a class="carte-lien" href="#/dessin-anime/${encodeURIComponent(d.id)}">
        ${vignetteHTML(d)}
        <div class="carte-infos">
          <h2 class="carte-titre">${esc(d.titre)}</h2>
          <p class="carte-vo">${esc(d.titreOriginal || "")}</p>
          <div class="puces">
            ${p.chaine ? `<span class="puce puce-chaine">${esc(p.chaine)}</span>` : ""}
            ${p.emission ? `<span class="puce">${esc(p.emission)}</span>` : ""}
          </div>
        </div>
      </a>
    </article>`;
}

function afficherGrille() {
  const liste = resultats();
  const grille = $("#grille");
  const favorisSeuls = routeActuelle().nom === "favoris";
  $("#compteur").textContent = `${liste.length} dessin${liste.length > 1 ? "s" : ""} animé${liste.length > 1 ? "s" : ""}${favorisSeuls ? " en favori" : ""}`;
  if (!liste.length) {
    grille.innerHTML = favorisSeuls && !etat.favoris.size
      ? `<div class="encart"><strong>Aucun favori pour l'instant.</strong><br />Touchez le cœur d'un dessin animé pour le retrouver ici.</div>`
      : `<div class="encart"><strong>Aucun résultat.</strong><br />Essayez un autre titre ou réinitialisez les filtres.</div>`;
    return;
  }
  grille.innerHTML = liste.map(carteHTML).join("");
  grille.querySelectorAll(".coeur").forEach(majCoeur);
}

/* ---------- Fiche détaillée ---------- */
const fiche = $("#fiche");

function badge(d, champ) {
  return (d.aVerifier || []).includes(champ)
    ? `<span class="a-verifier" title="Information non confirmée ou sources contradictoires">à vérifier</span>`
    : "";
}

function valeurOuInconnu(v) {
  return v ? esc(v) : `<span class="non-renseigne">Non renseigné</span>`;
}

function ficheHTML(d) {
  const p = d.premiereDiffusion || {};
  const generiques = lecteursGenerique(d);
  const integrables = generiques.filter((m) => m.embed);
  const liens = generiques.filter((m) => !m.embed && m.lien);
  const ext = extraits(d);
  const episodes = (d.episodes || []).map((e) => ({ titre: e.titre || "Épisodes", url: urlHttps(e.url), plateforme: e.plateforme || "" })).filter((e) => e.url);
  const sources = (d.sources || []).map(urlHttps).filter(Boolean);

  return `
    <header class="fiche-entete">
      <div style="flex:1;min-width:0">
        <h2 id="ficheTitre">${esc(d.titre)}</h2>
        <p>${esc(d.titreOriginal || "")}</p>
      </div>
      <div class="actions">
        <button class="coeur" type="button" data-id="${esc(d.id)}" data-titre="${esc(d.titre)}"></button>
        <button class="fermer" type="button" data-action="fermer" aria-label="Fermer la fiche">✕</button>
      </div>
    </header>

    <section aria-label="Générique">
      <div class="tv">
        <div class="tv-ecran" id="ficheEcran">
          <div class="mire"><span>${!integrables.length ? "Générique non disponible" : LIENS_SEULEMENT ? "Ouvrez le générique dans YouTube" : "Choisissez un lecteur"}</span></div>
        </div>
        <div class="tv-socle" aria-hidden="true"><i></i><i></i><i></i></div>
      </div>
      <h3>Générique</h3>
      ${integrables.length
        ? `${d.generique?.titre ? `<p class="generique-titre">${esc(d.generique.titre)}</p>` : ""}
           <div class="lecteurs">${integrables.map((m, i) => LIENS_SEULEMENT
             ? `<a class="btn btn-jaune" href="${esc(m.lien)}" target="_blank" rel="noopener">▶ Écouter sur ${esc(m.titre)} ↗</a>`
             : `<button class="btn btn-ghost" type="button" data-lecteur="g${i}" aria-pressed="false">▶ Regarder sur ${esc(m.titre)}</button>`).join("")}
           ${!LIENS_SEULEMENT && integrables.some((m) => m.youtubeId) ? `<a class="btn btn-jaune" href="#/juke-box" data-ecouter="${esc(d.id)}">♪ Écouter dans le juke-box</a>` : ""}</div>
           ${d.generique?.officiel === false ? `<p class="contribuer"><span class="a-verifier">non officiel</span> Vidéo mise en ligne par un particulier, elle peut disparaître.${LIENS_SEULEMENT ? "" : ` <a href="${esc(integrables[0].lien)}" target="_blank" rel="noopener">Ouvrir sur YouTube ↗</a>`}</p>` : ""}`
        : `<p class="non-dispo">Non disponible</p>`}
      ${liens.length ? `<ul class="liste-medias">${liens.map((m) => `<li><span><span class="src">${esc(m.source)}</span> Générique</span><a href="${esc(m.lien)}" target="_blank" rel="noopener">Voir sur ina.fr ↗</a></li>`).join("")}</ul>` : ""}

      <h3 style="margin-top:12px">Extraits et archives</h3>
      ${ext.length
        ? `<ul class="liste-medias">${ext.map((m, i) => `<li><span><span class="src">${esc(m.source)}</span> ${esc(m.titre)}</span>${m.embed
            ? `<button class="btn btn-ghost" type="button" data-lecteur="e${i}" aria-pressed="false">▶ Lire</button>`
            : `<a href="${esc(m.lien)}" target="_blank" rel="noopener">Voir ↗</a>`}</li>`).join("")}</ul>`
        : `<p class="non-dispo">Non disponible</p>`}

      <h3 style="margin-top:12px">Épisodes</h3>
      ${episodes.length
        ? `<ul class="liste-medias">${episodes.map((e) => `<li><span>${esc(e.titre)}${e.plateforme ? ` <span class="src">${esc(e.plateforme)}</span>` : ""}</span><a href="${esc(e.url)}" target="_blank" rel="noopener">Ouvrir ↗</a></li>`).join("")}</ul>`
        : `<p class="non-dispo">Non disponible</p>`}
    </section>

    <section aria-label="Informations">
      <h3>Histoire</h3>
      <p class="description">${esc(d.description || "")}</p>
      <h3 style="margin-top:12px">Fiche</h3>
      <dl class="infos">
        <dt>Titre original</dt><dd>${valeurOuInconnu(d.titreOriginal)}</dd>
        <dt>Pays</dt><dd>${valeurOuInconnu((d.pays || []).join(", "))}${badge(d, "pays")}</dd>
        <dt>Studio</dt><dd>${valeurOuInconnu(d.studio)}${badge(d, "studio")}</dd>
        <dt>1re diffusion</dt><dd>${valeurOuInconnu(formaterDate(p.date))}${badge(d, "date")}</dd>
        <dt>Chaîne</dt><dd>${valeurOuInconnu(p.chaine)}${badge(d, "chaine")}</dd>
        <dt>Émission</dt><dd>${valeurOuInconnu(p.emission)}${badge(d, "emission")}</dd>
      </dl>
      ${d.notes ? `<p class="note">${esc(d.notes)}</p>` : ""}
      ${(d.aVerifier || []).length ? `<p class="contribuer">Champs à confirmer : ${(d.aVerifier).map((c) => esc(LIBELLES_CHAMPS[c] || c)).join(", ")}.</p>` : ""}
      ${sources.length ? `<h3 style="margin-top:12px">Sources</h3><ul class="sources">${sources.map((s) => `<li><a href="${esc(s)}" target="_blank" rel="noopener">${esc(s)}</a></li>`).join("")}</ul>` : ""}
    </section>`;
}

function ouvrirFiche(id) {
  const d = etat.parId.get(id);
  if (!d) return fermerFiche();
  const contenu = $("#ficheContenu");
  contenu.innerHTML = ficheHTML(d);
  contenu.querySelectorAll(".coeur").forEach(majCoeur);
  const lecteurs = {};
  lecteursGenerique(d).filter((m) => m.embed).forEach((m, i) => (lecteurs[`g${i}`] = m));
  extraits(d).forEach((m, i) => m.embed && (lecteurs[`e${i}`] = m));
  contenu.querySelectorAll("[data-lecteur]").forEach((b) =>
    b.addEventListener("click", () => {
      jukebox.pause();
      contenu.querySelectorAll("[data-lecteur]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      const m = lecteurs[b.dataset.lecteur];
      const ecran = $("#ficheEcran");
      ecran.innerHTML = `<iframe src="${esc(m.embed)}" title="${esc(`${d.titre} — ${m.titre}`)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
      ecran.classList.remove("allumage");
      void ecran.offsetWidth;
      ecran.classList.add("allumage");
    }));
  const ecouter = contenu.querySelector("[data-ecouter]");
  if (ecouter) ecouter.addEventListener("click", () => (jukebox.demande = d.id));
  if (!fiche.open) fiche.showModal();
  fiche.scrollTop = 0;
  document.title = `${d.titre} · Mercredi 75-87`;
}

function fermerFiche() {
  if (fiche.open) fiche.close();
  $("#ficheContenu").innerHTML = ""; // coupe la lecture en cours
  document.title = "Mercredi 75-87";
}

fiche.addEventListener("close", () => {
  $("#ficheContenu").innerHTML = "";
  if (routeActuelle().nom === "fiche") {
    history.replaceState(null, "", etat.vueListe === "favoris" ? "#/favoris" : "#/");
    router();
  }
});
fiche.addEventListener("click", (e) => {
  if (e.target === fiche || e.target.closest("[data-action='fermer']")) fiche.close();
});

/* ---------- Juke-box (API IFrame YouTube) ---------- */
const jukebox = {
  file: [],
  ordre: [],
  index: -1,
  melange: false,
  lecteur: null,
  pret: null,
  enLecture: false,
  demande: null, // id à jouer en arrivant sur le juke-box

  source() {
    return document.querySelector("input[name='jbSource']:checked").value;
  },

  reconstruire() {
    const enCours = this.courant()?.id;
    this.file = etat.items
      .filter((d) => (this.source() === "favoris" ? etat.favoris.has(d.id) : true))
      .map((d) => ({ id: d.id, titre: d.titre, d, youtubeId: lecteursGenerique(d).find((m) => m.youtubeId)?.youtubeId }))
      .filter((p) => p.youtubeId);
    this.ordre = this.file.map((_, i) => i);
    if (this.melange) melanger(this.ordre);
    this.index = Math.max(-1, this.ordre.findIndex((i) => this.file[i].id === enCours));
    this.afficherFile();
  },

  courant() {
    return this.index >= 0 ? this.file[this.ordre[this.index]] : null;
  },

  afficherFile() {
    const ol = $("#jbFile");
    const vide = $("#jbVide");
    const aucun = !this.file.length;
    ["#jbPrec", "#jbPlay", "#jbSuiv", "#jbMelange"].forEach((s) => ($(s).disabled = aucun || LIENS_SEULEMENT));
    if (LIENS_SEULEMENT) {
      $("#jbMire").innerHTML = "<span>Touchez un titre pour l'écouter sur YouTube</span>";
      $(".jb-commandes").hidden = true;
      $("#jbEnCours").hidden = true;
    }
    vide.hidden = !aucun;
    if (aucun) {
      ol.innerHTML = "";
      vide.innerHTML = this.source() === "favoris"
        ? `<strong>Aucun générique jouable dans vos favoris.</strong><br />Ajoutez en favori des dessins animés dont le générique est disponible.`
        : `<strong>Aucun générique disponible.</strong><br />Pour en ajouter un, renseignez l'identifiant YouTube de la vidéo dans <code>data/dessins-animes.json</code> (voir la notice).`;
      return;
    }
    ol.innerHTML = this.ordre.map((i, pos) => {
      const p = this.file[i];
      const c1 = couleurValide(p.d.couleurs?.[0], "#3a2a8c");
      const c2 = couleurValide(p.d.couleurs?.[1], "#ff4f9a");
      if (LIENS_SEULEMENT) {
        return `<li><a class="jb-lien" href="https://www.youtube.com/watch?v=${esc(p.youtubeId)}" target="_blank" rel="noopener">
          <span class="pastille" style="--c1:${c1};--c2:${c2}"></span>${esc(p.titre)}
          <small>${esc(p.d.premiereDiffusion?.annee || "")} ↗</small></a></li>`;
      }
      return `<li><button type="button" data-pos="${pos}" ${pos === this.index ? 'aria-current="true"' : ""}>
          <span class="pastille" style="--c1:${c1};--c2:${c2}"></span>${esc(p.titre)}
          <small>${esc(p.d.premiereDiffusion?.annee || "")}</small></button></li>`;
    }).join("");
  },

  chargerApi() {
    if (this.pret) return this.pret;
    this.pret = new Promise((resolve, reject) => {
      if (window.YT && window.YT.Player) return resolve();
      window.onYouTubeIframeAPIReady = () => resolve();
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.onerror = () => {
        this.pret = null;
        reject(new Error("API YouTube injoignable"));
      };
      document.head.appendChild(s);
    });
    return this.pret;
  },

  async jouer(pos) {
    if (!this.file.length) return;
    this.index = (pos + this.ordre.length) % this.ordre.length;
    const piste = this.courant();
    this.afficherFile();
    $("#jbEnCours").textContent = `♪ ${piste.titre}`;
    $("#jbMire").hidden = true;
    try {
      await this.chargerApi();
    } catch {
      $("#jbMire").hidden = false;
      $("#jbMire").innerHTML = `<span>Lecteur bloqué : <a href="https://www.youtube.com/watch?v=${esc(piste.youtubeId)}" target="_blank" rel="noopener">écouter sur YouTube ↗</a></span>`;
      return;
    }
    if (this.lecteur) {
      this.lecteur.loadVideoById(piste.youtubeId);
    } else {
      this.lecteur = new YT.Player("jbPlayer", {
        host: "https://www.youtube-nocookie.com",
        videoId: piste.youtubeId,
        playerVars: { autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onStateChange: (e) => {
            this.enLecture = e.data === YT.PlayerState.PLAYING;
            majBoutonPlay();
            if (e.data === YT.PlayerState.ENDED) this.suivant();
          },
          onError: () => this.suivant(), // vidéo retirée ou non intégrable : on passe
        },
      });
    }
    const ecran = $("#jbEcran");
    ecran.classList.remove("allumage");
    void ecran.offsetWidth;
    ecran.classList.add("allumage");
  },

  basculer() {
    if (!this.lecteur || this.index < 0) return this.jouer(Math.max(0, this.index));
    if (this.enLecture) this.lecteur.pauseVideo();
    else this.lecteur.playVideo();
  },

  pause() {
    if (this.lecteur && this.enLecture) this.lecteur.pauseVideo();
  },

  suivant() { this.jouer(this.index + 1); },
  precedent() { this.jouer(this.index - 1); },
};

function melanger(t) {
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
}

function majBoutonPlay() {
  const b = $("#jbPlay");
  b.textContent = jukebox.enLecture ? "⏸" : "▶";
  b.setAttribute("aria-label", jukebox.enLecture ? "Pause" : "Lecture");
}

$("#jbPlay").addEventListener("click", () => jukebox.basculer());
$("#jbSuiv").addEventListener("click", () => jukebox.suivant());
$("#jbPrec").addEventListener("click", () => jukebox.precedent());
$("#jbMelange").addEventListener("click", (e) => {
  jukebox.melange = !jukebox.melange;
  e.currentTarget.setAttribute("aria-pressed", String(jukebox.melange));
  jukebox.reconstruire();
});
document.querySelectorAll("input[name='jbSource']").forEach((r) => r.addEventListener("change", () => jukebox.reconstruire()));
$("#jbFile").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-pos]");
  if (b) jukebox.jouer(Number(b.dataset.pos));
});

/* ---------- Navigation ---------- */
function routeActuelle() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  if (h.startsWith("dessin-anime/")) return { nom: "fiche", id: h.slice("dessin-anime/".length) };
  if (h === "juke-box") return { nom: "juke-box" };
  if (h === "favoris") return { nom: "favoris" };
  return { nom: "catalogue" };
}

function router() {
  const r = routeActuelle();
  const onglet = r.nom === "fiche" ? etat.vueListe : r.nom;
  document.querySelectorAll(".tabs a").forEach((a) => {
    if (a.dataset.route === onglet) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });

  if (r.nom === "juke-box") {
    fermerFiche();
    $("#vueCatalogue").hidden = true;
    $("#vueJukebox").hidden = false;
    jukebox.reconstruire();
    if (jukebox.demande) {
      const pos = jukebox.ordre.findIndex((i) => jukebox.file[i].id === jukebox.demande);
      jukebox.demande = null;
      if (pos >= 0) jukebox.jouer(pos);
    }
    return;
  }

  $("#vueJukebox").hidden = true;
  $("#vueCatalogue").hidden = false;
  if (r.nom === "fiche") {
    afficherGrille();
    ouvrirFiche(r.id);
  } else {
    etat.vueListe = r.nom;
    fermerFiche();
    afficherGrille();
  }
}

/* ---------- Démarrage ---------- */
document.addEventListener("click", (e) => {
  const coeur = e.target.closest(".coeur");
  if (coeur) {
    e.preventDefault();
    basculerFavori(coeur.dataset.id);
  }
});

let minuterie;
champs.recherche.addEventListener("input", () => {
  clearTimeout(minuterie);
  minuterie = setTimeout(afficherGrille, 120);
});
[champs.annee, champs.chaine, champs.emission, champs.pays].forEach((s) => s.addEventListener("change", afficherGrille));
$("#reinit").addEventListener("click", () => {
  champs.recherche.value = "";
  [champs.annee, champs.chaine, champs.emission, champs.pays].forEach((s) => (s.value = ""));
  afficherGrille();
  champs.recherche.focus();
});
window.addEventListener("hashchange", router);

(async function demarrer() {
  chargerFavoris();
  majCompteurFavoris();
  try {
    await chargerDonnees();
  } catch (err) {
    $("#grille").innerHTML = `<div class="encart"><strong>Impossible de charger le catalogue.</strong><br />
      Si vous avez ouvert le fichier directement depuis votre ordinateur, lancez un petit serveur local
      (par exemple <code>python3 -m http.server</code> dans le dossier <code>mercredi</code>) puis ouvrez <code>http://localhost:8000</code>.</div>`;
    console.error(err);
    return;
  }
  remplirFiltres();
  router();
})();
