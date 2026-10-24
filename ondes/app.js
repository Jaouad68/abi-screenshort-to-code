/* Ondes : radios et télévisions du monde entier.
 * Radios : API publique Radio Browser (https://www.radio-browser.info).
 * Télévisions : listes publiques iptv-org (https://github.com/iptv-org/iptv) et Free-TV (https://github.com/Free-TV/IPTV).
 * Favoris, récents et réglages restent dans le navigateur (localStorage). */
(() => {
  "use strict";

  // ---------- Constantes ----------
  const RB_FALLBACK = ["https://de1.api.radio-browser.info", "https://fi1.api.radio-browser.info", "https://de2.api.radio-browser.info"];
  const IPTV = "https://iptv-org.github.io/iptv";
  const IPTV_RAW = "https://raw.githubusercontent.com/iptv-org/iptv/master/streams";
  const FREETV = "https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8";
  const STORE_KEY = "ondes:v1";
  const PAGE = 40;
  const HTTPS_ONLY = location.protocol === "https:";

  const ISO = ("AD AE AF AG AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BQ BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CW CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FM FO FR GA GB GD GE GF GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MK ML MM MN MO MQ MR MT MU MV MW MX MY MZ NA NC NE NG NI NL NO NP NZ OM PA PE PF PG PH PK PL PR PS PT PY QA RE RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SX SY SZ TD TG TH TJ TL TM TN TO TR TT TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WS XK YE YT ZA ZM ZW").split(" ");

  const GENRES = [
    { tag: "news", label: "Actualités", emoji: "📰", h: 210 },
    { tag: "pop", label: "Pop", emoji: "🎤", h: 330 },
    { tag: "jazz", label: "Jazz", emoji: "🎷", h: 30 },
    { tag: "classical", label: "Classique", emoji: "🎻", h: 45 },
    { tag: "rock", label: "Rock", emoji: "🎸", h: 0 },
    { tag: "hip hop", label: "Hip-hop", emoji: "🎧", h: 270 },
    { tag: "electronic", label: "Électro", emoji: "🎛️", h: 190 },
    { tag: "quran", label: "Coran", emoji: "🕌", h: 150 },
    { tag: "sports", label: "Sport", emoji: "⚽", h: 110 },
    { tag: "chillout", label: "Chill", emoji: "🌙", h: 240 },
    { tag: "80s", label: "Années 80", emoji: "📼", h: 300 },
    { tag: "arabic", label: "Musique arabe", emoji: "🪘", h: 20 },
    { tag: "talk", label: "Talk & débats", emoji: "🎙️", h: 170 },
    { tag: "reggae", label: "Reggae", emoji: "🌴", h: 90 },
    { tag: "country", label: "Country", emoji: "🤠", h: 35 },
    { tag: "kids", label: "Enfants", emoji: "🧸", h: 55 },
  ];

  const TV_CATS = {
    news: "Infos", sports: "Sport", movies: "Films", music: "Musique", kids: "Enfants", entertainment: "Divertissement",
    documentary: "Documentaires", religious: "Religion", general: "Généraliste", culture: "Culture", lifestyle: "Art de vivre",
    series: "Séries", business: "Économie", education: "Éducation", cooking: "Cuisine", travel: "Voyage", comedy: "Humour",
    weather: "Météo", science: "Science", auto: "Auto", animation: "Animation", classic: "Classiques", family: "Famille",
    legislative: "Parlement", outdoor: "Plein air", relax: "Détente", shop: "Téléachat", undefined: "Autres",
  };

  const regionNames = new Intl.DisplayNames(["fr"], { type: "region" });
  const langNames = new Intl.DisplayNames(["fr"], { type: "language" });
  const langName = (l) => { try { const n = langNames.of(l); return n && n !== l ? n[0].toUpperCase() + n.slice(1) : l; } catch { return l; } };
  const countryName = (cc) => { try { return regionNames.of(cc) || cc; } catch { return cc; } };
  const flag = (cc) => (cc && cc.length === 2 ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "🌐");
  const COUNTRIES = ISO.map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name, "fr"));

  // ---------- Stockage ----------
  const store = (() => {
    let data = { favs: [], recents: [], country: null, volume: 1 };
    try { Object.assign(data, JSON.parse(localStorage.getItem(STORE_KEY) || "{}")); } catch { /* navigation privée */ }
    const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch { /* ignore */ } };
    return {
      get: () => data,
      set(patch) { Object.assign(data, patch); save(); },
      isFav: (item) => data.favs.some((f) => f.type === item.type && f.id === item.id),
      toggleFav(item) {
        const on = this.isFav(item);
        data.favs = on ? data.favs.filter((f) => !(f.type === item.type && f.id === item.id)) : [slim(item), ...data.favs];
        save();
        return !on;
      },
      addRecent(item) {
        data.recents = [slim(item), ...data.recents.filter((f) => !(f.type === item.type && f.id === item.id))].slice(0, 24);
        save();
      },
    };
  })();

  function slim(it) {
    const { type, id, name, logo, url, alt, urls, country, tags, hls, homepage, codec, bitrate, group } = it;
    return { type, id, name, logo, url, alt, urls, country, tags, hls, homepage, codec, bitrate, group };
  }

  function defaultCountry() {
    const saved = store.get().country;
    if (saved) return saved;
    for (const lang of navigator.languages || [navigator.language]) {
      const m = /-([A-Z]{2})$/i.exec(lang || "");
      if (m && ISO.includes(m[1].toUpperCase())) return m[1].toUpperCase();
    }
    return "FR";
  }
  let country = defaultCountry();

  // ---------- Utilitaires ----------
  const $ = (s) => document.querySelector(s);
  function h(tag, props = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "style") el.style.cssText = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return el;
  }
  const svg = (inner, cls = "") => {
    const t = document.createElement("template");
    t.innerHTML = `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true">${inner}</svg>`;
    return t.content.firstChild;
  };
  const ICON = {
    play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/>',
    pause: '<rect x="6" y="4" width="4.5" height="16" rx="1.2"/><rect x="13.5" y="4" width="4.5" height="16" rx="1.2"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    back: '<path d="m15 6-6 6 6 6"/>',
  };
  const hue = (s) => { let x = 0; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) % 360; return x; };
  const initials = (name) => (String(name).replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("") || "♪").toUpperCase();
  const safeUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : null; } catch { return null; } };

  function art(item, extra = "") {
    const box = h("span", { class: `art ${extra}` });
    const mono = () => {
      box.classList.add("mono");
      box.style.setProperty("--h", hue(item.name));
      box.replaceChildren(h("span", {}, initials(item.name)));
    };
    let logo = safeUrl(item.logo);
    if (logo && HTTPS_ONLY) logo = logo.replace(/^http:/, "https:");
    if (logo) {
      const img = h("img", { src: logo, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" });
      img.addEventListener("error", mono, { once: true });
      box.append(img);
    } else mono();
    return box;
  }

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2800);
  }

  async function fetchText(url, timeout = 12000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status });
      return await r.text();
    } finally {
      clearTimeout(timer);
    }
  }
  const fetchJSON = async (url, timeout) => JSON.parse(await fetchText(url, timeout));

  // ---------- Radio Browser ----------
  let rbServers = null;
  async function servers() {
    if (rbServers) return rbServers;
    try {
      const list = await fetchJSON("https://all.api.radio-browser.info/json/servers", 5000);
      const names = [...new Set(list.map((s) => `https://${s.name}`))].sort(() => Math.random() - 0.5);
      rbServers = names.length ? names : RB_FALLBACK;
    } catch {
      rbServers = RB_FALLBACK;
    }
    return rbServers;
  }

  async function rb(path, params = {}) {
    const list = await servers();
    let lastErr;
    for (const base of list) {
      const u = new URL(`${base}/json/${path}`);
      for (const [k, v] of Object.entries(params)) if (v != null && v !== "") u.searchParams.set(k, v);
      try {
        const data = await fetchJSON(u.href);
        rbServers = [base, ...list.filter((b) => b !== base)]; // garde le serveur qui répond en tête
        return data;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  }

  const radioCache = new Map();
  async function radios(params) {
    const p = { hidebroken: "true", order: "clickcount", reverse: "true", limit: PAGE, ...params };
    if (HTTPS_ONLY) p.is_https = "true";
    const key = JSON.stringify(p);
    if (!radioCache.has(key)) radioCache.set(key, rb("stations/search", p).then((list) => dedupe(list.map(toRadio))).catch((e) => { radioCache.delete(key); throw e; }));
    return radioCache.get(key);
  }

  function toRadio(s) {
    const url = s.url_resolved || s.url;
    return {
      type: "radio",
      id: s.stationuuid,
      name: (s.name || "Radio").trim().replace(/\s+/g, " "),
      logo: s.favicon,
      url,
      alt: s.url !== url ? s.url : null,
      homepage: s.homepage,
      country: (s.countrycode || "").toUpperCase(),
      tags: (s.tags || "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 3),
      hls: s.hls === 1 || /\.m3u8(\?|$)/i.test(url),
      codec: s.codec,
      bitrate: s.bitrate,
    };
  }

  function dedupe(list) {
    const seen = new Set();
    return list.filter((r) => {
      const k = r.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  const registerClick = (id) => servers().then((l) => fetch(`${l[0]}/json/url/${id}`).catch(() => {}));

  // ---------- Télévision (iptv-org + Free-TV) ----------
  // Trois annuaires fusionnés pour un maximum de chaînes : la liste par pays d'iptv-org,
  // ses fichiers sources (chaînes pas encore classées, plateformes Pluto, Samsung TV Plus…)
  // et la liste Free-TV. Les doublons sont regroupés : leurs flux servent de secours.
  const tvCache = new Map();
  const PLATFORMS = Object.fromEntries(("at:pluto,samsung au:samsung ba:morescreens be:samsung br:pluto,samsung bz:nexgen ca:pluto,samsung,stingray " +
    "ch:pluto,samsung cn:112114,cctv,cgtn,yeslivetv de:pluto,rakuten,samsung dk:pluto,samsung es:pluto,rakuten,samsung,yowi fi:rakuten,samsung " +
    "fr:bfm,fashiontv,groupecanalplus,groupem6,persiana,pluto,rakuten,samsung,traceplus gt:streamhispanatv id:denstv ie:samsung " +
    "in:distro,doordarshan,pishow,samsung ir:telewebion,wnslive it:pluto,rakuten,samsung kh:happywatch99 lu:samsung mn:skygo mt:smashplus " +
    "mx:amagi,multimedios,pluto,samsung nl:samsung no:pluto,samsung nz:samsung pe:opencaster ph:comclark pl:mediateka,rakuten pt:samsung " +
    "ru:15plusmg,bonustv,catcast,mylifeisgood,ntv,rt,smotrim,televizor24,tvbricks,tvteleport,zabava se:pluto,samsung si:xploretv sk:antik " +
    "so:premiumfree th:v2hcdn tr:gem,onetv uk:bbc,distro,pluto,rakuten,samsung,sportstribal " +
    "us:30a,3abn,abcnews,afrolandtv,amagi,canelatv,cbsn,cineversetv,distro,firetv,frequency,glewedtv,klowdtv,local,malimartv,pbs,plex,pluto," +
    "roku,samsung,sofast,ssh101,stirr,tcl,tubi,uplynk,vegasplus,vizio,wcetv,wfmz,wowza,xumo za:freevisiontv").split(" ").map((p) => { const [cc, list] = p.split(":"); return [cc, list.split(",")]; }));
  // Langues de chaque pays (base iptv-org), limitées à celles qui ont une liste de chaînes.
  const LANGS = Object.fromEntries(("AF:pus,prd,tuk AX:swe AL:sqi DZ:ara,fra AS:eng,smo AD:cat AO:por AI:eng AQ:eng AG:eng AR:grn,spa AM:hye AW:nld,pap AU:eng AT:deu " +
    "AZ:aze,rus BS:eng BH:ara BD:ben BB:eng BY:bel,rus BE:deu,fra,nld BZ:eng,spa BJ:fra BM:eng BO:aym,grn,que,spa BQ:eng,nld,pap " +
    "BA:bos,hrv,srp BW:eng BV:nor BR:por IO:eng VG:eng BN:msa BG:bul BF:fra BI:fra,run KH:khm CM:eng,fra CA:eng,fra CV:por KY:eng " +
    "CF:fra TD:ara,fra CL:spa CN:zho CX:eng CC:eng CO:spa KM:ara,fra CK:eng CR:spa HR:hrv CU:spa CW:eng,nld,pap CY:ell,tur CZ:ces,slk " +
    "CD:fra,kon,lin,lua,swa DK:dan DJ:ara,fra DM:eng DO:spa TL:por EC:spa EG:ara SV:spa GQ:fra,por,spa ER:ara,eng,tir EE:est ET:amh " +
    "FK:eng FO:dan FJ:eng FI:fin,swe FR:fra GF:fra PF:fra TF:fra GA:fra GM:eng GE:kat DE:deu GH:eng GI:eng GR:ell GD:eng GP:fra " +
    "GU:eng,spa GT:spa GG:eng,fra GN:fra GW:por GY:eng HT:fra,hat HM:eng HN:spa HK:eng,zho HU:hun IS:isl IN:eng,hin,tam ID:ind IR:fas " +
    "IQ:ara IE:eng,gle IM:eng IL:ara,heb IT:ita CI:fra JM:eng JP:jpn JE:eng,fra JO:ara KZ:kaz,rus KE:eng,swa KI:eng XK:sqi,srp KW:ara " +
    "KG:kir,rus LA:lao LV:lav LB:ara,fra LS:eng LR:eng LY:ara LI:deu LT:lit LU:deu,fra,ltz MO:por,zho MG:fra MW:eng MY:eng,msa MV:div " +
    "ML:fra MT:eng,mlt MH:eng MQ:fra MR:ara,fra MU:eng,fra YT:fra MX:spa FM:eng MD:ron MC:fra MN:mon ME:cnr,srp,bos,sqi,hrv MS:eng " +
    "MA:ara,fra MZ:por MM:mya NA:afr,deu,eng,her NR:eng NP:nep NL:nld NC:fra NZ:eng,mri NI:spa NE:fra NG:eng NU:eng NF:eng KP:kor " +
    "MK:mkd MP:eng NO:nor OM:ara PK:eng,urd PW:eng PS:ara PA:spa PG:eng,hmo,tpi PY:grn,spa PE:aym,que,spa PH:eng,fil PN:eng PL:pol " +
    "PT:por PR:eng,spa QA:ara CG:fra,kon,lin RO:ron RU:rus RW:eng,fra,kin RE:fra BL:fra SH:eng KN:eng LC:eng MF:fra PM:fra VC:eng " +
    "WS:eng,smo SM:ita SA:ara SN:fra RS:srp SC:eng,fra SL:eng SG:eng,msa,zho,tam SX:eng,fra,nld SK:slk,ces SI:slv SB:eng SO:ara,som " +
    "ZA:afr,eng,nbl,ssw,tso,ven,xho,zul GS:eng KR:kor SS:eng ES:spa,cat,eus,glg LK:sin,tam SD:ara,eng SR:nld SJ:nor SZ:eng,ssw SE:swe " +
    "CH:deu,fra,ita SY:ara ST:por TW:zho TJ:rus,tgk TZ:eng,swa TH:tha TG:fra TK:eng,smo TO:eng TT:eng TN:ara,fra TR:tur TM:rus,tuk " +
    "TC:eng TV:eng UM:eng VI:eng UG:eng,swa UA:ukr AE:ara UK:eng US:eng,spa UY:spa UZ:rus,uzb VU:eng,fra VA:ita,lat VE:spa VN:vie " +
    "WF:fra EH:spa YE:ara ZM:eng ZW:eng,tso,ven,xho").split(" ").map((p) => { const [cc, list] = p.split(":"); return [cc, list.split(",")]; }));
  const NOT_PLAYABLE = /^https?:\/\/([\w-]+\.)*(youtube\.com|youtu\.be|twitch\.tv|dailymotion\.com|facebook\.com)\//i;
  // Catégorie devinée d'après le nom pour les chaînes que l'annuaire ne classe pas.
  const GUESS = [
    ["news", /news|info|actu|noticias|nachrichten|journal|24\/7|أخبار|اخبار/i], ["sports", /sport|foot|golf|racing|fight|deporte|رياض/i],
    ["kids", /kids|junior|enfant|cartoon|toon|niños|anime|baby|أطفال/i], ["music", /music|musique|hits|radio|mtv|trace|clubbing|قناة الموسيق/i],
    ["religious", /quran|coran|islam|church|gospel|god|catholic|bible|قرآن|القرآن|السنة/i], ["movies", /movie|film|cin[eé]|sine|افلام|أفلام/i],
    ["documentary", /docu|history|histoire|nature|discovery|geo\b/i], ["cooking", /cook|cuisine|food|chef|kitchen/i], ["series", /series|séries|novela|drama/i],
  ];
  const ccFix = (cc) => (cc === "UK" ? "GB" : cc);

  function tvGroup(raw, name) {
    const g = (raw || "").toLowerCase().replace(/\s*\(.*\)$/, "").trim();
    if (g && g !== "undefined" && TV_CATS[g]) return g;
    return GUESS.find(([, re]) => re.test(name))?.[0] || "undefined";
  }

  function parseM3U(text, cc) {
    const out = [];
    let cur = null;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (line.startsWith("#EXTINF")) {
        const attrs = {};
        for (const m of line.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[m[1]] = m[2];
        const title = line.slice(line.lastIndexOf(",") + 1).trim();
        cur = { attrs, title };
      } else if (line && !line.startsWith("#") && cur) {
        const url = safeUrl(line);
        if (url && !NOT_PLAYABLE.test(url) && !/^vod/i.test(cur.attrs["group-title"] || "")) {
          const name = cur.title.replace(/\s*\(\d+p\)/gi, "").replace(/\s*\[[^\]]*\]/g, "").replace(/\s*[Ⓐ-ⓩ]/g, "").trim() || cur.title;
          const tvgId = cur.attrs["tvg-id"] || "";
          const fromId = tvgId.split("@")[0].split(".").pop();
          const country = cc || ccFix((cur.attrs["tvg-country"] || (tvgId.includes(".") ? fromId : "")).toUpperCase().slice(0, 2));
          const groups = (cur.attrs["group-title"] || "").split(";");
          out.push({ type: "tv", id: (tvgId || name).split("@")[0].toLowerCase(), name, logo: cur.attrs["tvg-logo"] || undefined, group: tvGroup(groups[0], name), urls: [url], country });
        }
        cur = null;
      }
    }
    return out;
  }

  // Regroupe les chaînes identiques (même identifiant ou même nom) et additionne leurs flux.
  function mergeTV(lists) {
    const byId = new Map();
    const byName = new Map();
    const all = [];
    const nameKey = (n) => norm(n).replace(/[^\p{L}\p{N}]/gu, "");
    for (const ch of lists.flat()) {
      const k = nameKey(ch.name) + "|" + ch.country;
      const hit = byId.get(ch.id) || byName.get(k);
      if (hit) {
        for (const u of ch.urls) if (!hit.urls.includes(u)) hit.urls.push(u);
        if (!hit.logo) hit.logo = ch.logo;
        if (hit.group === "undefined") hit.group = ch.group;
        if (!hit.country) hit.country = ch.country;
      } else {
        const copy = { ...ch, urls: [...ch.urls] };
        all.push(copy);
        byId.set(ch.id, copy);
        byName.set(k, copy);
      }
    }
    // Les flux en https d'abord : seuls lisibles depuis une page sécurisée.
    for (const ch of all) ch.urls.sort((a, b) => (b.startsWith("https:") ? 1 : 0) - (a.startsWith("https:") ? 1 : 0));
    return all
      .filter((c) => !HTTPS_ONLY || c.urls.some((u) => u.startsWith("https:")))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }

  function m3u(url, cc) {
    return fetchText(url, 30000).then((t) => parseM3U(t, cc), (e) => { if (e.status === 404) return []; throw e; });
  }

  let freeTVAll = null;
  const freeTV = () => (freeTVAll ||= m3u(FREETV).catch((e) => { freeTVAll = null; throw e; }));

  // Une source en panne n'empêche pas d'afficher les autres ; échec seulement si toutes tombent.
  async function gather(promises) {
    const res = await Promise.allSettled(promises);
    const ok = res.filter((r) => r.status === "fulfilled").map((r) => r.value);
    if (!ok.length) throw res[0].reason;
    return mergeTV(ok);
  }

  function tvList(kind, code) {
    const key = `${kind}:${code}`;
    if (!tvCache.has(key)) {
      let sources;
      if (kind === "all") {
        sources = [m3u(`${IPTV}/index.m3u`), freeTV()];
      } else if (kind === "languages") {
        sources = [m3u(`${IPTV}/languages/${code}.m3u`)];
      } else if (kind === "int") {
        sources = [m3u(`${IPTV}/countries/int.m3u`)];
      } else {
        const file = code === "GB" ? "uk" : code.toLowerCase(); // iptv-org nomme le Royaume-Uni « uk »
        sources = [
          m3u(`${IPTV}/countries/${file}.m3u`, code),
          m3u(`${IPTV_RAW}/${file}.m3u`, code),
          ...(PLATFORMS[file] || []).map((p) => m3u(`${IPTV_RAW}/${file}_${p}.m3u`, code)),
          freeTV().then((l) => l.filter((c) => c.country === code)),
        ];
      }
      tvCache.set(key, gather(sources).catch((e) => { tvCache.delete(key); throw e; }));
    }
    return tvCache.get(key);
  }

  // ---------- Lecteur audio ----------
  const audio = $("#audio");
  const player = { item: null, queue: [], index: -1, hls: null, triedAlt: false, state: "idle", sleepAt: 0, sleepTimer: null };
  audio.volume = store.get().volume ?? 1;
  // iPhone : une appli installée sur l'écran d'accueil est muette en mode silencieux,
  // sauf en session « playback », celle des lecteurs de musique (iOS 17 et plus).
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch { /* ignore */ }

  function attach(media, url, isHls, onFatal) {
    const native = media.canPlayType("application/vnd.apple.mpegurl");
    if (isHls && !native && window.Hls?.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) onFatal(); });
      hls.loadSource(url);
      hls.attachMedia(media);
      return hls;
    }
    media.src = url;
    return null;
  }

  // Certains flux ne répondent jamais sans déclencher d'erreur : au-delà de ce délai,
  // on passe au flux de secours plutôt que de rester sur « Connexion… ».
  const STALL_MS = 15000;
  let audioWatch;

  function stopAudio() {
    clearTimeout(audioWatch);
    player.hls?.destroy();
    player.hls = null;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }

  function playRadio(item, queue = null) {
    closeTV();
    if (queue) {
      player.queue = queue;
      player.index = queue.findIndex((q) => q.id === item.id);
    } else if (!player.queue.some((q) => q.id === item.id)) {
      player.queue = [item];
      player.index = 0;
    } else player.index = player.queue.findIndex((q) => q.id === item.id);

    if (player.item?.id === item.id && player.state !== "error") return togglePlay();

    stopAudio();
    player.item = item;
    player.triedAlt = false;
    setState("loading");
    load(item.url, item.hls);
    store.addRecent(item);
    registerClick(item.id);
    setGlow(item.name);
    updatePlayerUI();
    updateMediaSession();
  }

  function load(url, isHls) {
    player.hls = attach(audio, url, isHls, onAudioError);
    clearTimeout(audioWatch);
    audioWatch = setTimeout(() => { if (player.state === "loading") onAudioError(); }, STALL_MS);
    audio.play().catch((e) => {
      if (e.name === "NotAllowedError") { clearTimeout(audioWatch); setState("paused"); }
      else if (e.name !== "AbortError") onAudioError();
    });
  }

  function onAudioError() {
    if (!player.item) return;
    if (!player.triedAlt && player.item.alt) {
      player.triedAlt = true;
      stopAudio();
      load(player.item.alt, /\.m3u8/i.test(player.item.alt));
      return;
    }
    stopAudio();
    setState("error");
    toast(`${player.item.name} ne répond pas pour le moment. Essaie une autre station.`);
  }

  function togglePlay() {
    if (!player.item) return;
    if (audio.paused || player.state === "error") {
      if (player.state === "error" || !audio.src) { stopAudio(); setState("loading"); load(player.item.url, player.item.hls); }
      else { setState("loading"); audio.play().catch(() => setState("paused")); }
    } else audio.pause();
  }

  function step(dir) {
    if (player.queue.length < 2) return toast("Aucune autre station dans cette liste.");
    const i = (player.index + dir + player.queue.length) % player.queue.length;
    playRadio(player.queue[i]);
  }

  audio.addEventListener("playing", () => { clearTimeout(audioWatch); setState("playing"); });
  audio.addEventListener("waiting", () => setState("loading"));
  audio.addEventListener("pause", () => { if (player.state !== "error") setState("paused"); });
  audio.addEventListener("error", () => { if (audio.getAttribute("src")) onAudioError(); });

  function setState(s) {
    player.state = s;
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = s === "playing" ? "playing" : "paused";
    paintButtons();
    markPlaying();
  }

  function playIcon() {
    if (player.state === "loading") return h("span", { class: "spinner" });
    return svg(player.state === "playing" ? ICON.pause : ICON.play);
  }

  function paintButtons() {
    const label = player.state === "playing" ? "Pause" : "Lecture";
    for (const id of ["#mini-toggle", "#now-toggle"]) {
      const b = $(id);
      b.replaceChildren(playIcon());
      b.setAttribute("aria-label", label);
    }
    $("#mini-eq").classList.toggle("paused", player.state !== "playing");
    $("#now").classList.toggle("paused", player.state !== "playing");
    $("#now-status").textContent = { playing: "En direct", loading: "Connexion…", paused: "En pause", error: "Indisponible" }[player.state] || "En direct";
  }

  function subtitle(item) {
    const parts = [];
    if (item.country) parts.push(`${flag(item.country)} ${countryName(item.country)}`);
    if (item.type === "radio" && item.tags?.length) parts.push(item.tags.slice(0, 2).join(", "));
    if (item.type === "tv" && item.group) parts.push(TV_CATS[item.group] || item.group);
    return parts.join(" · ");
  }

  function paintFav(btn, item) {
    const on = store.isFav(item);
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-label", on ? "Retirer des favoris" : "Ajouter aux favoris");
    btn.replaceChildren(svg(ICON.heart));
  }

  function updatePlayerUI() {
    const it = player.item;
    if (!it) return;
    $("#mini").hidden = false;
    $("#mini-art").replaceChildren(art(it));
    $("#mini-name").textContent = it.name;
    $("#mini-sub").textContent = subtitle(it);
    $("#now-art").replaceChildren(art(it));
    $("#now-name").textContent = it.name;
    $("#now-sub").textContent = subtitle(it);
    $("#now-tech").textContent = [it.codec, it.bitrate ? `${it.bitrate} kb/s` : ""].filter(Boolean).join(" · ");
    const site = safeUrl(it.homepage);
    $("#now-site").hidden = !site;
    if (site) $("#now-site").href = site;
    paintFav($("#now-fav"), it);
    paintButtons();
  }

  function markPlaying() {
    const id = player.item?.id;
    document.querySelectorAll("[data-radio-id]").forEach((el) => el.classList.toggle("playing", el.dataset.radioId === id));
  }

  function setGlow(name) {
    document.documentElement.style.setProperty("--glow", hue(name));
  }

  function updateMediaSession() {
    if (!("mediaSession" in navigator) || !player.item) return;
    const it = player.item;
    const logo = safeUrl(it.logo);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: it.name,
      artist: subtitle(it) || "Radio en direct",
      album: "Ondes",
      artwork: logo ? [{ src: logo, sizes: "512x512" }] : [{ src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }],
    });
    const ms = navigator.mediaSession;
    ms.setActionHandler("play", () => togglePlay());
    ms.setActionHandler("pause", () => audio.pause());
    ms.setActionHandler("stop", () => audio.pause());
    ms.setActionHandler("previoustrack", () => step(-1));
    ms.setActionHandler("nexttrack", () => step(1));
  }

  // Contrôles du lecteur
  $("#mini-toggle").addEventListener("click", togglePlay);
  $("#now-toggle").addEventListener("click", togglePlay);
  $("#mini-open").addEventListener("click", () => openSheet("now"));
  $("#now-prev").addEventListener("click", () => step(-1));
  $("#now-next").addEventListener("click", () => step(1));
  $("#now-fav").addEventListener("click", () => favToggle(player.item, $("#now-fav")));
  $("#volume").value = audio.volume;
  $("#volume").addEventListener("input", (e) => { audio.volume = +e.target.value; store.set({ volume: audio.volume }); });

  $("#share-btn").addEventListener("click", async () => {
    const it = player.item;
    if (!it) return;
    const text = `J'écoute ${it.name} sur Ondes`;
    const url = safeUrl(it.homepage) || location.href;
    try {
      if (navigator.share) await navigator.share({ title: it.name, text, url });
      else { await navigator.clipboard.writeText(`${text} : ${url}`); toast("Lien copié."); }
    } catch { /* partage annulé */ }
  });

  // Minuteur de sommeil
  $("#sleep-btn").addEventListener("click", (e) => { e.stopPropagation(); $("#sleep-menu").hidden = !$("#sleep-menu").hidden; });
  $("#sleep-menu").addEventListener("click", (e) => {
    const min = e.target.closest("button")?.dataset.sleep;
    if (min == null) return;
    $("#sleep-menu").hidden = true;
    clearInterval(player.sleepTimer);
    player.sleepAt = +min ? Date.now() + +min * 60000 : 0;
    if (player.sleepAt) {
      toast(`La radio s'arrêtera dans ${+min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60}` : ""}` : `${min} min`}.`);
      player.sleepTimer = setInterval(tickSleep, 1000);
    } else toast("Minuteur désactivé.");
    tickSleep();
  });
  document.addEventListener("click", (e) => { if (!e.target.closest("#sleep-menu, #sleep-btn")) $("#sleep-menu").hidden = true; });

  function tickSleep() {
    const btn = $("#sleep-btn");
    if (!player.sleepAt) { btn.classList.remove("on"); $("#sleep-label").textContent = "Minuteur"; return; }
    const left = player.sleepAt - Date.now();
    if (left <= 0) {
      clearInterval(player.sleepTimer);
      player.sleepAt = 0;
      audio.pause();
      toast("Bonne nuit. La radio est en pause.");
      return tickSleep();
    }
    btn.classList.add("on");
    const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
    $("#sleep-label").textContent = `${m}:${String(s).padStart(2, "0")}`;
  }

  function favToggle(item, btn) {
    if (!item) return;
    const on = store.toggleFav(item);
    toast(on ? `${item.name} ajouté aux favoris.` : `${item.name} retiré des favoris.`);
    if (btn) paintFav(btn, item);
    if (currentTab === "favoris") render();
  }

  // ---------- Lecteur TV ----------
  const video = $("#video");
  const tv = { item: null, queue: [], index: -1, hls: null, urlIndex: 0 };

  function playTV(item, queue) {
    audio.pause();
    if (queue) tv.queue = queue;
    tv.index = tv.queue.findIndex((q) => q.id === item.id);
    tv.item = item;
    tv.urlIndex = 0;
    store.addRecent(item);
    setGlow(item.name);
    $("#tv-logo").replaceChildren(art(item));
    $("#tv-name").textContent = item.name;
    $("#tv-sub").textContent = subtitle(item);
    paintFav($("#tv-fav"), item);
    openSheet("tvsheet");
    renderZap();
    loadTV();
  }

  let tvWatch;
  function stopVideo() {
    clearTimeout(tvWatch);
    tv.hls?.destroy();
    tv.hls = null;
    video.pause();
    video.removeAttribute("src");
    video.load();
  }

  function loadTV() {
    stopVideo();
    const url = tv.item.urls[tv.urlIndex];
    $("#screen-msg").hidden = true;
    $("#screen-load").hidden = false;
    tv.hls = attach(video, url, /\.m3u8(\?|$)/i.test(url) || !/\.(mp4|webm)(\?|$)/i.test(url), onTVError);
    tvWatch = setTimeout(() => { if (!$("#screen-load").hidden) onTVError(); }, STALL_MS + 5000);
    video.play().catch((e) => { if (e.name !== "NotAllowedError" && e.name !== "AbortError") onTVError(); });
  }

  function onTVError() {
    if (!tv.item) return;
    if (tv.urlIndex < tv.item.urls.length - 1) { tv.urlIndex++; return loadTV(); }
    stopVideo();
    $("#screen-load").hidden = true;
    const msg = $("#screen-msg");
    msg.replaceChildren(h("div", {},
      h("strong", {}, "Cette chaîne ne diffuse pas en ce moment"),
      "Elle est peut-être hors antenne ou réservée à son pays. Essaie la suivante.",
      h("div", { style: "margin-top:14px" }, h("button", { type: "button", class: "pill", onclick: () => stepTV(1) }, "Chaîne suivante"))));
    msg.hidden = false;
  }

  video.addEventListener("playing", () => { clearTimeout(tvWatch); $("#screen-load").hidden = true; });
  video.addEventListener("waiting", () => { $("#screen-load").hidden = false; });
  video.addEventListener("error", () => { if (video.getAttribute("src")) onTVError(); });

  function stepTV(dir) {
    if (tv.queue.length < 2) return;
    playTV(tv.queue[(tv.index + dir + tv.queue.length) % tv.queue.length]);
  }

  function closeTV() {
    if (!$("#tvsheet").hidden) closeSheet("tvsheet");
  }

  function renderZap() {
    const box = $("#tv-more");
    const start = Math.max(0, tv.index - 2);
    const slice = tv.queue.slice(start, start + 30);
    box.replaceChildren(...slice.map((c) => tvCard(c, tv.queue, c.id === tv.item.id)));
    box.querySelector(".current")?.scrollIntoView({ inline: "center", block: "nearest" });
  }

  $("#tv-prev").addEventListener("click", () => stepTV(-1));
  $("#tv-next").addEventListener("click", () => stepTV(1));
  $("#tv-fav").addEventListener("click", () => favToggle(tv.item, $("#tv-fav")));
  $("#tv-pip").addEventListener("click", async () => {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (video.requestPictureInPicture) await video.requestPictureInPicture();
      else if (video.webkitSetPresentationMode) video.webkitSetPresentationMode("picture-in-picture");
      else toast("L'incrustation n'est pas disponible sur cet appareil.");
    } catch { toast("Lance la chaîne avant d'activer l'incrustation."); }
  });
  $("#tv-full").addEventListener("click", () => {
    const el = $("#screen");
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
  });

  // ---------- Feuilles ----------
  function openSheet(id) {
    $(`#${id}`).hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeSheet(id) {
    $(`#${id}`).hidden = true;
    if (id === "tvsheet") { stopVideo(); tv.item = null; if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {}); }
    if ([...document.querySelectorAll(".sheet")].every((s) => s.hidden)) document.body.style.overflow = "";
  }
  document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => closeSheet(b.dataset.close)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const open = [...document.querySelectorAll(".sheet")].reverse().find((s) => !s.hidden);
      if (open) closeSheet(open.id);
    } else if (e.key === " " && player.item && !/INPUT|TEXTAREA|BUTTON/.test(document.activeElement.tagName) && $("#tvsheet").hidden) {
      e.preventDefault();
      togglePlay();
    }
  });

  // ---------- Choix du pays ----------
  let pickerDone = null;
  function pickCountry(onPick) {
    pickerDone = onPick;
    $("#picker-search").value = "";
    renderPicker("");
    openSheet("picker");
    setTimeout(() => $("#picker-search").focus(), 50);
  }
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  function renderPicker(q) {
    const nq = norm(q.trim());
    const list = COUNTRIES.filter((c) => !nq || norm(c.name).includes(nq) || c.code.toLowerCase() === nq);
    $("#picker-list").replaceChildren(...list.map((c) =>
      h("li", {}, h("button", { type: "button", class: c.code === country ? "sel" : null, onclick: () => { closeSheet("picker"); pickerDone?.(c.code); } },
        h("span", { class: "flag" }, flag(c.code)), c.name, c.code === country ? h("small", {}, "Actuel") : null))));
  }
  $("#picker-search").addEventListener("input", (e) => renderPicker(e.target.value));

  function setCountry(cc) {
    country = cc;
    store.set({ country: cc });
    render();
  }

  // ---------- Composants ----------
  function radioCard(item, queue) {
    return h("button", { type: "button", class: "card", "data-radio-id": item.id, onclick: () => playRadio(item, queue), "aria-label": `Écouter ${item.name}` },
      art(item), h("span", {}, h("strong", {}, item.name), h("small", {}, subtitle(item) || "Radio")));
  }

  function radioRow(item, queue) {
    return h("button", { type: "button", class: "row", "data-radio-id": item.id, onclick: () => playRadio(item, queue) },
      art(item),
      h("span", { class: "txt" }, h("strong", {}, item.name), h("small", {}, subtitle(item) || "Radio")),
      h("span", { class: "eq" }, h("i"), h("i"), h("i"), h("i")));
  }

  function tvCard(item, queue, current = false) {
    return h("button", { type: "button", class: `tv-card${current ? " current" : ""}`, onclick: () => playTV(item, queue), "aria-label": `Regarder ${item.name}` },
      h("span", { style: "position:relative;display:block" }, h("span", { class: "badge-live" }, "DIRECT"), art(item)),
      h("span", { class: "info" }, h("strong", {}, item.name), h("small", {}, subtitle(item))));
  }

  const skeletonRail = (n = 6) => h("div", { class: "rail" }, Array.from({ length: n }, () => h("div", {}, h("div", { class: "skeleton", style: "aspect-ratio:1" }), h("div", { class: "skeleton", style: "height:12px;margin-top:10px;width:70%;border-radius:6px" }))));
  const skeletonGrid = (n = 8) => h("div", { class: "tv-grid" }, Array.from({ length: n }, () => h("div", { class: "skeleton", style: "aspect-ratio:16/12" })));

  function errorBox(retry) {
    return h("div", { class: "error-box" },
      h("strong", {}, "Impossible de charger l'annuaire."), h("br"),
      "Vérifie ta connexion internet puis réessaie.",
      h("div", {}, h("button", { type: "button", class: "pill", onclick: retry }, "Réessayer")));
  }

  function section(title, body, action) {
    return h("section", { class: "section" },
      h("div", { class: "section-head" }, h("h2", {}, title), action || null),
      body);
  }

  // Remplit un conteneur avec le résultat d'une promesse, avec squelette et gestion d'erreur.
  function async_(placeholder, promise, build, retry) {
    const box = h("div", {}, placeholder);
    promise.then((data) => box.replaceChildren(build(data)), () => box.replaceChildren(errorBox(retry || render)));
    return box;
  }

  const countryChip = () =>
    h("button", { type: "button", class: "country-chip", onclick: () => pickCountry(setCountry), "aria-label": `Pays : ${countryName(country)}. Changer de pays` },
      h("span", { class: "flag" }, flag(country)), countryName(country), svg(ICON.chevron));

  // ---------- Vues ----------
  let currentTab = "radio";
  let sub = null; // sous-vue : { kind: 'genre'|'country', ... }

  function viewRadio() {
    if (sub) return viewRadioList(sub);
    const local = radios({ countrycode: country, limit: 24 });
    const world = rb("stations/topclick/30", { hidebroken: "true" }).then((l) => dedupe(l.map(toRadio)).filter((r) => !HTTPS_ONLY || r.url.startsWith("https:")));

    return h("div", {},
      h("div", { class: "head" }, h("div", {}, h("h1", {}, "Radio"), h("p", {}, "Des milliers de stations en direct, partout dans le monde.")), countryChip()),
      section(`Populaires · ${countryName(country)}`,
        async_(skeletonRail(), local, (list) => list.length ? h("div", { class: "rail" }, list.map((r) => radioCard(r, list))) : h("p", { class: "empty" }, "Aucune radio trouvée pour ce pays.")),
        h("button", { type: "button", class: "link", onclick: () => openSub({ kind: "country", code: country }) }, "Tout voir")),
      section("Genres", h("div", { class: "genres" }, GENRES.map((g) =>
        h("button", { type: "button", class: "genre", style: `--h:${g.h}`, onclick: () => openSub({ kind: "genre", tag: g.tag, label: g.label }) }, g.label, h("i", { "aria-hidden": "true" }, g.emoji))))),
      section("Tendances mondiales",
        async_(skeletonRail(), world, (list) => h("div", { class: "rail" }, list.map((r) => radioCard(r, list))))),
      recentsSection("radio"),
      section("Tous les pays", countriesGrid()));
  }

  function countriesGrid() {
    const box = h("div", { class: "countries" });
    const fill = (counts) => box.replaceChildren(...COUNTRIES
      .map((c) => ({ ...c, n: counts?.get(c.code) }))
      .filter((c) => !counts || c.n)
      .sort((a, b) => (b.n || 0) - (a.n || 0))
      .map((c) => h("button", { type: "button", class: "country", onclick: () => openSub({ kind: "country", code: c.code }) },
        h("span", { class: "flag" }, flag(c.code)),
        h("span", {}, h("strong", {}, c.name), h("small", {}, c.n ? `${c.n.toLocaleString("fr-FR")} radios` : "Radios")))));
    fill(null);
    rb("countries").then((list) => fill(new Map(list.map((c) => [c.iso_3166_1?.toUpperCase(), c.stationcount])))).catch(() => {});
    return box;
  }

  function viewRadioList(s) {
    const title = s.kind === "genre" ? s.label : `${flag(s.code)} ${countryName(s.code)}`;
    const params = s.kind === "genre" ? { tag: s.tag, tagExact: "false" } : { countrycode: s.code };
    const listBox = h("div", { class: "list two" });
    const more = h("button", { type: "button", class: "more-btn", hidden: true }, "Afficher plus");
    let offset = 0;
    let all = [];
    let filterCountry = s.kind === "genre" ? null : s.code;

    const load = () => {
      more.hidden = true;
      const p = { ...params, offset, limit: PAGE };
      if (s.kind === "genre" && filterCountry) p.countrycode = filterCountry;
      if (!offset) listBox.replaceChildren(...Array.from({ length: 8 }, () => h("div", { class: "skeleton", style: "height:64px;border-radius:14px" })));
      radios(p).then((list) => {
        if (!offset) listBox.replaceChildren();
        all = dedupe([...all, ...list]);
        const fresh = list.filter((r) => all.includes(r));
        listBox.append(...fresh.map((r) => radioRow(r, all)));
        if (!all.length) listBox.replaceChildren(h("p", { class: "empty" }, h("strong", {}, "Aucune radio ici"), "Essaie un autre pays ou un autre genre."));
        offset += PAGE;
        more.hidden = list.length < PAGE / 2;
        markPlaying();
      }, () => listBox.replaceChildren(errorBox(load)));
    };
    more.addEventListener("click", load);

    const scope = s.kind === "genre"
      ? h("div", { class: "chips", style: "margin-top:4px;margin-bottom:18px" },
          h("button", { type: "button", class: "chip", "aria-pressed": "true", onclick: (e) => { filterCountry = null; reset(e.currentTarget); } }, "🌍 Monde"),
          h("button", { type: "button", class: "chip", "aria-pressed": "false", onclick: (e) => { filterCountry = country; reset(e.currentTarget); } }, `${flag(country)} ${countryName(country)}`))
      : null;
    function reset(btn) {
      btn.parentElement.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === btn)));
      offset = 0; all = []; load();
    }

    load();
    return h("div", {},
      h("button", { type: "button", class: "back", onclick: () => { sub = null; render(); } }, svg(ICON.back), "Radio"),
      h("div", { class: "head" }, h("h1", {}, title)),
      scope, listBox, more);
  }

  let tvCat = "all";
  let tvScope = "country"; // "country", "int" ou un code de langue
  const TV_PAGE = 120;
  function viewTV() {
    const grid = h("div", {}, skeletonGrid());
    const chips = h("div", { class: "chips", style: "margin-bottom:18px" });
    const langs = LANGS[country] || [];
    if (tvScope !== "country" && tvScope !== "int" && !langs.includes(tvScope)) tvScope = "country";
    const scopes = [["country", `${flag(country)} ${countryName(country)}`], ...langs.map((l) => [l, `En ${langName(l).toLowerCase()}`]), ["int", "🌍 Internationales"]];
    const scopeChips = h("div", { class: "chips", style: "margin-bottom:10px" }, scopes.map(([k, label]) =>
      h("button", { type: "button", class: "chip", "aria-pressed": String(tvScope === k), onclick: () => { tvScope = k; tvCat = "all"; render(); } }, label)));

    const draw = (list, limit = TV_PAGE) => {
      const counts = new Map();
      for (const c of list) counts.set(c.group, (counts.get(c.group) || 0) + 1);
      const cats = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a));
      if (tvCat !== "all" && !counts.has(tvCat)) tvCat = "all";
      chips.replaceChildren(
        h("button", { type: "button", class: "chip", "aria-pressed": String(tvCat === "all"), onclick: () => { tvCat = "all"; draw(list); } }, `Toutes · ${list.length}`),
        ...cats.map((c) => h("button", { type: "button", class: "chip", "aria-pressed": String(tvCat === c), onclick: () => { tvCat = c; draw(list); } }, `${TV_CATS[c] || c} · ${counts.get(c)}`)));
      const shown = tvCat === "all" ? list : list.filter((c) => c.group === tvCat);
      // Les grandes listes s'affichent par pages pour rester fluides sur mobile.
      const more = shown.length > limit
        ? h("button", { type: "button", class: "more-btn", onclick: () => draw(list, limit + TV_PAGE) }, `Afficher plus · ${shown.length - limit} restantes`)
        : null;
      grid.replaceChildren(...(shown.length
        ? [h("div", { class: "tv-grid" }, shown.slice(0, limit).map((c) => tvCard(c, shown))), more]
        : [h("p", { class: "empty" }, h("strong", {}, "Aucune chaîne disponible"), langs.length
          ? `Aucune chaîne gratuite en accès libre n'est répertoriée pour ce pays. Essaie « En ${langName(langs[0]).toLowerCase()} » ou « Internationales ».`
          : "Aucune chaîne gratuite en accès libre n'est répertoriée pour ce pays. Essaie « Internationales ».")]).filter(Boolean));
    };

    const load = tvScope === "country" ? tvList("countries", country) : tvScope === "int" ? tvList("int", "int") : tvList("languages", tvScope);
    load.then((l) => draw(l), () => grid.replaceChildren(errorBox(render)));

    return h("div", {},
      h("div", { class: "head" }, h("div", {}, h("h1", {}, "Télévision"), h("p", {}, "Les chaînes gratuites en direct, pays par pays.")), countryChip()),
      recentsSection("tv"),
      h("div", { class: "section" }, scopeChips, chips, grid));
  }

  let searchQ = "";
  let searchType = "radio";
  let searchTimer;
  function viewSearch() {
    const input = h("input", { type: "search", class: "field", id: "search", placeholder: "Une radio, une chaîne, un pays…", value: searchQ, autocomplete: "off", enterkeyhint: "search" });
    const results = h("div", { class: "section" });
    const seg = h("div", { class: "seg", role: "group", "aria-label": "Type de résultat" },
      ["radio", "tv"].map((t) => h("button", { type: "button", "aria-pressed": String(searchType === t), onclick: (e) => {
        searchType = t;
        e.currentTarget.parentElement.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget)));
        run();
      } }, t === "radio" ? "Radios" : "Télévisions")));

    const run = () => {
      const q = searchQ.trim();
      if (q.length < 2) {
        results.replaceChildren(h("h2", { class: "section-head" }, "Genres"), h("div", { class: "genres" }, GENRES.slice(0, 8).map((g) =>
          h("button", { type: "button", class: "genre", style: `--h:${g.h}`, onclick: () => { location.hash = "#radio"; openSub({ kind: "genre", tag: g.tag, label: g.label }); } }, g.label, h("i", {}, g.emoji)))));
        return;
      }
      const countryHit = COUNTRIES.find((c) => norm(c.name) === norm(q));
      if (searchType === "radio") {
        results.replaceChildren(h("div", { class: "list two" }, Array.from({ length: 6 }, () => h("div", { class: "skeleton", style: "height:64px" }))));
        const p = countryHit ? radios({ countrycode: countryHit.code, limit: 60 }) : radios({ name: q, limit: 60 });
        p.then((list) => {
          if (q !== searchQ.trim()) return;
          results.replaceChildren(list.length
            ? h("div", { class: "list two" }, list.map((r) => radioRow(r, list)))
            : h("p", { class: "empty" }, h("strong", {}, "Aucune radio trouvée"), "Vérifie l'orthographe ou essaie un autre nom."));
          markPlaying();
        }, () => results.replaceChildren(errorBox(run)));
      } else {
        results.replaceChildren(h("p", { class: "empty" }, h("span", { class: "spinner" }), h("br"), "Recherche dans les chaînes du monde entier…"));
        const p = countryHit ? tvList("countries", countryHit.code) : tvList("all", "all");
        p.then((list) => {
          if (q !== searchQ.trim()) return;
          const nq = norm(q);
          const hits = countryHit ? list : list.filter((c) => norm(c.name).includes(nq)).slice(0, 120);
          results.replaceChildren(hits.length
            ? h("div", { class: "tv-grid" }, hits.map((c) => tvCard(c, hits)))
            : h("p", { class: "empty" }, h("strong", {}, "Aucune chaîne trouvée"), "Essaie le nom d'un pays, par exemple « Maroc »."));
        }, () => results.replaceChildren(errorBox(run)));
      }
    };

    input.addEventListener("input", () => { searchQ = input.value; clearTimeout(searchTimer); searchTimer = setTimeout(run, 350); });
    run();
    setTimeout(() => { if (matchMedia("(min-width: 900px)").matches) input.focus(); }, 0);
    return h("div", {}, h("div", { class: "head" }, h("h1", {}, "Rechercher")), input, seg, results);
  }

  function recentsSection(type) {
    const list = store.get().recents.filter((r) => r.type === type);
    if (!list.length) return null;
    return section(type === "tv" ? "Regardées récemment" : "Écoutées récemment",
      h("div", { class: "rail", style: type === "tv" ? "grid-auto-columns:minmax(160px,190px)" : null },
        list.map((it) => (type === "tv" ? tvCard(it, list) : radioCard(it, list)))));
  }

  let favType = "radio";
  function viewFavs() {
    const favs = store.get().favs;
    const shown = favs.filter((f) => f.type === favType);
    const seg = h("div", { class: "seg", role: "group" }, ["radio", "tv"].map((t) =>
      h("button", { type: "button", "aria-pressed": String(favType === t), onclick: () => { favType = t; render(); } },
        `${t === "radio" ? "Radios" : "Télévisions"} · ${favs.filter((f) => f.type === t).length}`)));
    const body = !shown.length
      ? h("div", { class: "empty" }, h("strong", {}, "Aucun favori pour l'instant"), "Touche le cœur dans le lecteur pour retrouver tes stations ici.")
      : favType === "radio"
        ? h("div", { class: "list two" }, shown.map((r) => radioRow(r, shown)))
        : h("div", { class: "tv-grid" }, shown.map((c) => tvCard(c, shown)));
    return h("div", {}, h("div", { class: "head" }, h("div", {}, h("h1", {}, "Favoris"), h("p", {}, "Tes stations et chaînes préférées, à portée de main."))), seg, h("div", { class: "section", style: "margin-top:18px" }, body));
  }

  function openSub(s) {
    sub = s;
    if (currentTab !== "radio") location.hash = "#radio";
    else render();
    window.scrollTo({ top: 0 });
  }

  function render() {
    const view = $("#view");
    const build = { radio: viewRadio, tv: viewTV, recherche: viewSearch, favoris: viewFavs }[currentTab] || viewRadio;
    view.replaceChildren(build());
    document.querySelectorAll("[data-tab]").forEach((a) => a.classList.toggle("active", a.dataset.tab === currentTab));
    markPlaying();
  }

  function route() {
    const tab = location.hash.slice(1) || "radio";
    const prev = currentTab;
    currentTab = ["radio", "tv", "recherche", "favoris"].includes(tab) ? tab : "radio";
    if (prev !== currentTab && currentTab !== "radio") sub = null;
    render();
    if (prev !== currentTab) window.scrollTo({ top: 0 });
  }
  window.addEventListener("hashchange", route);
  document.querySelectorAll("[data-tab]").forEach((a) => a.addEventListener("click", () => { if (a.dataset.tab === currentTab && sub) { sub = null; render(); } }));

  route();
  paintButtons();

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
