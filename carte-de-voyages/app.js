/* Carte de voyages : carnet de voyages avec carte du monde interactive.
 * Données des pays : data/countries.js (window.COUNTRIES, window.CONTINENTS).
 * Les voyages sont stockés dans le navigateur (localStorage). */
(() => {
  "use strict";

  const STORAGE_KEY = "carte-de-voyages:v1";
  const VIEW = { x: 0, y: 0, w: 1000, h: 520 };
  const MAX_ZOOM = 12;

  const COUNTRIES = window.COUNTRIES;
  const CONTINENTS = window.CONTINENTS;
  const byCode = new Map(COUNTRIES.map((c) => [c.code, c]));
  const TOTAL_AREA = COUNTRIES.reduce((s, c) => s + c.area, 0);

  const EXAMPLE = {
    marks: {},
    trips: [
      { code: "FR", year: 2018, cities: ["Paris"], note: "" },
      { code: "ES", year: 2019, cities: ["Madrid", "Barcelone", "Séville"], note: "" },
      { code: "IT", year: 2019, cities: ["Rome", "Florence", "Venise"], note: "Premier long voyage" },
      { code: "AR", year: 2022, cities: ["Buenos Aires", "Bariloche"], note: "Voyage entre potes dans le sud" },
      { code: "BR", year: 2023, cities: ["Rio de Janeiro", "Salvador"], note: "Carnaval" },
      { code: "PE", year: 2023, cities: ["Cusco", "Lima"], note: "Machu Picchu" },
      { code: "TH", year: 2024, cities: ["Bangkok", "Chiang Mai"], note: "" },
      { code: "JP", year: 2024, cities: ["Tokyo", "Kyoto"], note: "Saison des sakuras" },
    ],
  };

  // ---------- État ----------
  let state = load();
  let selected = null; // code pays
  let editingId = null; // id du voyage en cours de modification
  let filter = "all";
  const view = { ...VIEW };

  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  function withIds(data) {
    return {
      marks: { ...(data.marks || {}) },
      trips: (data.trips || [])
        .filter((t) => byCode.has(t.code) && Number.isInteger(+t.year))
        .map((t) => ({
          id: t.id || uid(),
          code: t.code,
          year: +t.year,
          cities: (t.cities || []).map((c) => String(c).trim()).filter(Boolean),
          note: String(t.note || "").trim(),
        })),
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return withIds(JSON.parse(raw));
    } catch {
      /* stockage indisponible ou corrompu : on repart de l'exemple */
    }
    return withIds(EXAMPLE);
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* navigation privée : l'app reste utilisable sans sauvegarde */
    }
  }

  function statusOf(code) {
    if (state.trips.some((t) => t.code === code)) return "visited";
    return state.marks[code] || "none";
  }

  function visitedCodes() {
    return COUNTRIES.filter((c) => statusOf(c.code) === "visited").map((c) => c.code);
  }

  // ---------- Utilitaires DOM ----------
  const $ = (sel) => document.querySelector(sel);
  const SVG_NS = "http://www.w3.org/2000/svg";

  function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k in el && typeof v !== "string") el[k] = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  const fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
  const normalize = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 2400);
  }

  // ---------- Carte ----------
  const svg = $("#map");
  const gMap = document.createElementNS(SVG_NS, "g");
  svg.append(gMap);
  const paths = new Map();

  for (const c of COUNTRIES) {
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", c.d);
    p.dataset.code = c.code;
    paths.set(c.code, p);
    gMap.append(p);
  }

  function paintMap() {
    for (const [code, p] of paths) {
      const s = statusOf(code);
      p.classList.toggle("visited", s === "visited");
      p.classList.toggle("pending", s === "pending");
      p.classList.toggle("selected", code === selected);
    }
    // La sélection passe au-dessus pour que son contour ne soit pas masqué.
    if (selected) gMap.append(paths.get(selected));
  }

  function applyView() {
    svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`);
  }

  function clampView() {
    view.w = Math.min(VIEW.w, Math.max(VIEW.w / MAX_ZOOM, view.w));
    view.h = view.w * (VIEW.h / VIEW.w);
    view.x = Math.min(VIEW.w - view.w, Math.max(0, view.x));
    view.y = Math.min(VIEW.h - view.h, Math.max(0, view.y));
  }

  // Le SVG garde le ratio 1000x520 centré dans un cadre plus haut :
  // conversion écran -> coordonnées de la carte via la matrice du SVG.
  function toMap(clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function zoomAt(factor, cx, cy) {
    const newW = Math.min(VIEW.w, Math.max(VIEW.w / MAX_ZOOM, view.w / factor));
    const k = newW / view.w;
    view.x = cx - (cx - view.x) * k;
    view.y = cy - (cy - view.y) * k;
    view.w = newW;
    clampView();
    applyView();
  }

  function zoomToCountry(code) {
    const box = paths.get(code).getBBox();
    const pad = 1.6;
    let w = Math.max(box.width * pad, (box.height * pad * VIEW.w) / VIEW.h, VIEW.w / 6);
    w = Math.min(w, VIEW.w);
    view.w = w;
    view.h = w * (VIEW.h / VIEW.w);
    view.x = box.x + box.width / 2 - view.w / 2;
    view.y = box.y + box.height / 2 - view.h / 2;
    clampView();
    applyView();
  }

  function resetView() {
    Object.assign(view, VIEW);
    applyView();
  }

  // Glisser pour déplacer, pincer pour zoomer, molette pour zoomer.
  const pointers = new Map();
  let drag = null;
  let pinch = null;

  svg.addEventListener("pointerdown", (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      drag = { start: toMap(e.clientX, e.clientY), sx: e.clientX, sy: e.clientY, moved: false, target: e.target };
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) };
      drag = null;
    }
  });

  svg.addEventListener("pointermove", (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = toMap((a.x + b.x) / 2, (a.y + b.y) / 2);
      zoomAt(dist / pinch.dist, mid.x, mid.y);
      pinch.dist = dist;
      return;
    }

    if (drag) {
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 5) {
        drag.moved = true;
        svg.setPointerCapture(e.pointerId);
        svg.classList.add("dragging");
        hideTooltip();
      }
      if (drag.moved) {
        const cur = toMap(e.clientX, e.clientY);
        view.x += drag.start.x - cur.x;
        view.y += drag.start.y - cur.y;
        clampView();
        applyView();
      }
      return;
    }

    if (e.pointerType === "mouse") {
      const code = e.target.dataset?.code;
      if (code) showTooltip(code, e);
      else hideTooltip();
    }
  });

  function endPointer(e) {
    pointers.delete(e.pointerId);
    if (drag && !drag.moved && e.type === "pointerup") {
      const code = drag.target.dataset?.code;
      if (code) select(code === selected ? null : code);
    }
    if (pointers.size < 2) pinch = null;
    drag = null;
    svg.classList.remove("dragging");
  }
  svg.addEventListener("pointerup", endPointer);
  svg.addEventListener("pointercancel", endPointer);
  svg.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse") hideTooltip();
  });

  svg.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const p = toMap(e.clientX, e.clientY);
      zoomAt(e.deltaY < 0 ? 1.25 : 0.8, p.x, p.y);
    },
    { passive: false },
  );

  document.querySelector(".zoom").addEventListener("click", (e) => {
    const action = e.target.closest("button")?.dataset.zoom;
    if (action === "reset") return resetView();
    if (action) zoomAt(action === "in" ? 1.6 : 1 / 1.6, view.x + view.w / 2, view.y + view.h / 2);
  });

  const tooltip = $("#tooltip");
  function showTooltip(code, e) {
    const rect = $("#map-wrap").getBoundingClientRect();
    tooltip.textContent = byCode.get(code).name;
    tooltip.style.left = `${e.clientX - rect.left}px`;
    tooltip.style.top = `${e.clientY - rect.top}px`;
    tooltip.hidden = false;
  }
  function hideTooltip() {
    tooltip.hidden = true;
  }

  // ---------- Sélection / panneau pays ----------
  function select(code, { zoom = false } = {}) {
    selected = code;
    editingId = null;
    if (code && zoom) zoomToCountry(code);
    render();
  }

  function setStatus(code, status) {
    if (status === "none") delete state.marks[code];
    else state.marks[code] = status;
    save();
    render();
  }

  function renderPanel() {
    const panel = $("#panel");
    panel.replaceChildren();

    if (!selected) {
      panel.append(h("div", { class: "panel-empty" }, "Aucun pays sélectionné. Touche la carte ou cherche un pays pour commencer."));
      return;
    }

    const c = byCode.get(selected);
    const status = statusOf(selected);
    const trips = state.trips.filter((t) => t.code === selected).sort((a, b) => a.year - b.year);
    const editing = trips.find((t) => t.id === editingId);

    const segBtn = (value, label) =>
      h(
        "button",
        {
          type: "button",
          "data-status": value,
          "aria-pressed": String(status === value),
          disabled: trips.length > 0 && value !== "visited",
          onclick: () => setStatus(selected, value),
        },
        label,
      );

    const year = new Date().getFullYear();
    const form = h(
      "form",
      {
        class: "trip-form",
        onsubmit: (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          const y = parseInt(fd.get("year"), 10);
          if (!Number.isInteger(y) || y < 1900 || y > year + 5) return toast("Indique une année valide.");
          const data = {
            year: y,
            cities: String(fd.get("cities")).split(",").map((s) => s.trim()).filter(Boolean),
            note: String(fd.get("note")).trim(),
          };
          if (editing) {
            Object.assign(editing, data);
            toast("Voyage modifié.");
          } else {
            state.trips.push({ id: uid(), code: selected, ...data });
            toast(`Voyage ajouté : ${c.name}.`);
          }
          delete state.marks[selected];
          editingId = null;
          save();
          render();
        },
      },
      h("div", {}, h("label", { for: "f-year" }, "Année"),
        h("input", { id: "f-year", name: "year", type: "number", inputmode: "numeric", min: "1900", max: String(year + 5), required: true, value: String(editing ? editing.year : year) })),
      h("div", {}, h("label", { for: "f-cities" }, "Villes (séparées par des virgules)"),
        h("input", { id: "f-cities", name: "cities", placeholder: "ex. Hanoï, Hội An", value: editing ? editing.cities.join(", ") : "" })),
      h("div", { class: "full" }, h("label", { for: "f-note" }, "Note"),
        h("input", { id: "f-note", name: "note", maxlength: "80", placeholder: "ex. Road trip en famille", value: editing ? editing.note : "" })),
      h("div", { class: "full form-actions" },
        h("button", { type: "submit", class: "btn btn-primary" }, editing ? "Enregistrer" : "Ajouter le voyage"),
        editing && h("button", { type: "button", class: "btn btn-ghost", onclick: () => { editingId = null; renderPanel(); } }, "Annuler"),
      ),
    );

    panel.append(
      h("div", { class: "panel-box" },
        h("div", { class: "panel-top" },
          h("div", {}, h("h3", {}, c.name), h("p", {}, CONTINENTS[c.continent])),
          h("button", { type: "button", class: "close", "aria-label": "Fermer", onclick: () => select(null) }, "×"),
        ),
        h("div", { class: "segmented", role: "group", "aria-label": "Statut du pays" },
          segBtn("none", "Pas visité"), segBtn("visited", "Visité"), segBtn("pending", "En attente")),
        trips.length > 0 && h("p", { class: "note" }, "Pays visité car il contient des voyages."),
        trips.length > 0 && h("h4", {}, trips.length > 1 ? `${trips.length} voyages` : "1 voyage"),
        trips.length > 0 && h("ul", { class: "mini-trips" },
          trips.map((t) =>
            h("li", {},
              h("span", {}, h("strong", {}, String(t.year)), t.cities.length ? ` · ${t.cities.join(", ")}` : ""),
              h("span", { class: "actions" },
                h("button", { type: "button", class: "icon-btn", onclick: () => { editingId = t.id; renderPanel(); $("#f-year").focus(); } }, "Modifier"),
                h("button", { type: "button", class: "icon-btn danger", "aria-label": `Supprimer le voyage ${t.year}`, onclick: () => removeTrip(t.id) }, "Supprimer"),
              ),
            ),
          ),
        ),
        h("h4", {}, editing ? `Modifier le voyage ${editing.year}` : "Ajouter un voyage"),
        form,
      ),
    );
  }

  function removeTrip(id) {
    const t = state.trips.find((x) => x.id === id);
    if (!t || !confirm(`Supprimer le voyage ${t.year} (${byCode.get(t.code).name}) ?`)) return;
    state.trips = state.trips.filter((x) => x.id !== id);
    if (editingId === id) editingId = null;
    save();
    render();
    toast("Voyage supprimé.");
  }

  // ---------- Statistiques ----------
  function renderStats() {
    const visited = visitedCodes();
    const area = visited.reduce((s, code) => s + byCode.get(code).area, 0);
    const pct = (area / TOTAL_AREA) * 100;
    $("#stat-pct").textContent = `${pct > 0 && pct < 1 ? fmt.format(pct) : Math.round(pct)} %`;
    $("#stat-countries").textContent = visited.length;

    const cities = new Set();
    for (const t of state.trips) for (const city of t.cities) cities.add(`${t.code}|${normalize(city)}`);
    $("#stat-cities").textContent = cities.size;

    const continents = new Set(visited.map((code) => byCode.get(code).continent));
    $("#stat-continents").textContent = `${continents.size}/6`;
  }

  // ---------- Liste des voyages ----------
  function renderFilter() {
    const sel = $("#filter");
    const years = [...new Set(state.trips.map((t) => t.year))].sort((a, b) => b - a);
    const used = new Set(state.trips.map((t) => byCode.get(t.code).continent));
    const options = [
      h("option", { value: "all" }, "Tous"),
      h("option", { value: "pending" }, "En attente"),
      used.size > 0 && h("optgroup", { label: "Continent" },
        Object.entries(CONTINENTS).filter(([k]) => used.has(k)).map(([k, v]) => h("option", { value: `c:${k}` }, v))),
      years.length > 0 && h("optgroup", { label: "Année" }, years.map((y) => h("option", { value: `y:${y}` }, String(y)))),
    ].filter(Boolean);
    sel.replaceChildren(...options);
    if (![...sel.options].some((o) => o.value === filter)) filter = "all";
    sel.value = filter;
  }

  function renderTrips() {
    const list = $("#trips");
    list.replaceChildren();

    if (filter === "pending") {
      const pending = COUNTRIES.filter((c) => statusOf(c.code) === "pending");
      if (!pending.length) return list.append(h("li", { class: "empty" }, "Aucun pays en attente. Marque tes envies sur la carte."));
      for (const c of pending) {
        list.append(rowFor(c.code,
          h("div", { class: "t-main" }, h("div", { class: "t-title" }, h("i", { class: "dot-pending" }), c.name)),
          h("div", { class: "t-cities" }, CONTINENTS[c.continent])));
      }
      return;
    }

    const trips = state.trips
      .filter((t) => {
        if (filter.startsWith("c:")) return byCode.get(t.code).continent === filter.slice(2);
        if (filter.startsWith("y:")) return t.year === +filter.slice(2);
        return true;
      })
      .sort((a, b) => a.year - b.year || byCode.get(a.code).name.localeCompare(byCode.get(b.code).name, "fr"));

    if (!trips.length) {
      return list.append(h("li", { class: "empty" }, "Aucun voyage pour l'instant. Touche un pays sur la carte pour en ajouter un."));
    }

    for (const t of trips) {
      list.append(rowFor(t.code,
        h("div", { class: "t-main" },
          h("div", { class: "t-title" }, `${t.year} · ${byCode.get(t.code).name}`),
          t.note && h("div", { class: "t-note" }, t.note)),
        h("div", { class: "t-cities" }, t.cities.join(", "))));
    }
  }

  function rowFor(code, ...children) {
    return h("li", {
      tabindex: "0",
      class: code === selected ? "active" : null,
      onclick: () => {
        select(code, { zoom: true });
        if (matchMedia("(max-width: 860px)").matches) $("#map-wrap").scrollIntoView({ behavior: "smooth", block: "center" });
      },
      onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } },
    }, ...children);
  }

  // ---------- Graphique ----------
  function renderChart() {
    const chart = $("#chart");
    const counts = new Map();
    for (const t of state.trips) counts.set(t.year, (counts.get(t.year) || 0) + 1);
    const years = [...counts.keys()].sort((a, b) => a - b);
    chart.replaceChildren();
    if (!years.length) return chart.append(h("p", { class: "empty" }, "Ton graphique apparaîtra ici."));
    const max = Math.max(...counts.values());
    chart.setAttribute("aria-label", years.map((y) => `${y} : ${counts.get(y)} voyage${counts.get(y) > 1 ? "s" : ""}`).join(", "));
    for (const y of years) {
      const n = counts.get(y);
      chart.append(
        h("div", { class: "bar-col" },
          h("span", { class: "bar-val" }, String(n)),
          h("div", { class: "bar", style: `height:${(n / max) * 72}%` }),
          h("span", { class: "bar-year" }, String(y))),
      );
    }
  }

  // ---------- Recherche ----------
  const input = $("#search");
  const suggest = $("#suggest");
  let matches = [];
  let active = -1;

  function renderSuggest() {
    const q = normalize(input.value);
    suggest.replaceChildren();
    if (!q) return closeSuggest();
    matches = COUNTRIES.filter((c) => normalize(c.name).includes(q))
      .sort((a, b) => normalize(a.name).startsWith(q) === normalize(b.name).startsWith(q) ? 0 : normalize(a.name).startsWith(q) ? -1 : 1)
      .slice(0, 8);
    active = matches.length ? 0 : -1;
    if (!matches.length) {
      suggest.append(h("li", { class: "empty" }, "Aucun pays trouvé"));
    } else {
      matches.forEach((c, i) => {
        const s = statusOf(c.code);
        suggest.append(h("li", {
          role: "option",
          id: `opt-${c.code}`,
          "aria-selected": String(i === active),
          onmousedown: (e) => { e.preventDefault(); choose(c.code); },
        }, c.name, h("small", {}, s === "visited" ? "Visité" : s === "pending" ? "En attente" : CONTINENTS[c.continent])));
      });
    }
    suggest.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function closeSuggest() {
    suggest.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }

  function choose(code) {
    input.value = "";
    closeSuggest();
    input.blur();
    select(code, { zoom: true });
    $("#panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  input.addEventListener("input", renderSuggest);
  input.addEventListener("blur", closeSuggest);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") return closeSuggest();
    if (!matches.length || suggest.hidden) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length;
      [...suggest.children].forEach((li, i) => li.setAttribute("aria-selected", String(i === active)));
      input.setAttribute("aria-activedescendant", `opt-${matches[active].code}`);
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      choose(matches[active].code);
    }
  });

  // ---------- Export / import / réinitialisation ----------
  $("#btn-export").addEventListener("click", () => {
    const data = { app: "carte-de-voyages", version: 1, ...state };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = h("a", { href: url, download: `carte-de-voyages-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  $("#file-import").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.trips)) throw new Error("format");
      state = withIds(data);
      selected = null;
      save();
      render();
      toast(`${state.trips.length} voyages importés.`);
    } catch {
      toast("Fichier invalide.");
    }
  });

  $("#btn-reset").addEventListener("click", () => {
    const choice = prompt("Tape « vider » pour effacer tous tes voyages, ou « exemple » pour recharger les voyages d'exemple.");
    const v = choice && normalize(choice);
    if (v !== "vider" && v !== "exemple") return;
    state = v === "vider" ? { marks: {}, trips: [] } : withIds(EXAMPLE);
    selected = null;
    save();
    resetView();
    render();
    toast(v === "vider" ? "Carnet vidé." : "Exemple rechargé.");
  });

  $("#filter").addEventListener("change", (e) => {
    filter = e.target.value;
    renderTrips();
  });

  // ---------- Rendu global ----------
  function render() {
    paintMap();
    renderStats();
    renderPanel();
    renderFilter();
    renderTrips();
    renderChart();
  }

  applyView();
  render();
})();
