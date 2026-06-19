/* ============================================================
   RESTO PILOT — Logique applicative (vanilla JS)
   ============================================================ */
(function () {
  const D = window.RP;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const eur = (n) => n.toLocaleString("fr-FR");
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  /* ---------- SVG helpers ---------- */
  function lineChart(series, opts = {}) {
    // series: [{values, color, fill}] ; labels in opts.labels
    const W = 560, H = 200, pl = 36, pr = 14, pt = 16, pb = 26;
    const labels = opts.labels || [];
    const all = series.flatMap(s => s.values);
    const max = Math.max(...all) * 1.12, min = Math.min(...all, 0);
    const x = i => pl + (i * (W - pl - pr)) / (labels.length - 1);
    const y = v => pt + (H - pt - pb) * (1 - (v - min) / (max - min));
    let grid = "";
    for (let g = 0; g <= 4; g++) {
      const gy = pt + ((H - pt - pb) / 4) * g;
      grid += `<line x1="${pl}" y1="${gy}" x2="${W - pr}" y2="${gy}"/>`;
    }
    let xa = labels.map((l, i) => `<text class="lc-axis" x="${x(i)}" y="${H - 8}" text-anchor="middle">${l}</text>`).join("");
    let ya = "";
    for (let g = 0; g <= 4; g++) {
      const val = min + ((max - min) / 4) * (4 - g);
      const gy = pt + ((H - pt - pb) / 4) * g + 4;
      ya += `<text class="lc-axis" x="${pl - 8}" y="${gy}" text-anchor="end">${Math.round(val / 1000)}k</text>`;
    }
    let paths = "";
    series.forEach(s => {
      const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
      const area = `${pl},${y(min)} ${pts} ${W - pr},${y(min)}`;
      if (s.fill) paths += `<polygon class="lc-area" points="${area}" fill="${s.color}"/>`;
      paths += `<polyline class="lc-line" points="${pts}" stroke="${s.color}" ${s.dash ? 'stroke-dasharray="5 5" opacity=".55"' : ''}/>`;
      if (!s.dash) paths += s.values.map((v, i) => `<circle class="lc-dot" cx="${x(i)}" cy="${y(v)}" r="3.5" fill="${s.color}"/>`).join("");
    });
    return `<svg class="linechart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      <g class="lc-grid">${grid}</g>${ya}${xa}${paths}</svg>`;
  }

  function donut(data, size = 150) {
    const r = size / 2 - 14, cx = size / 2, cy = size / 2, C = 2 * Math.PI * r;
    let off = 0;
    const total = data.reduce((a, d) => a + d.value, 0);
    const segs = data.map(d => {
      const len = (d.value / total) * C;
      const s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${d.color}" stroke-width="16"
        stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" stroke-linecap="round"
        transform="rotate(-90 ${cx} ${cy})"/>`;
      off += len; return s;
    }).join("");
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${segs}</svg>`;
  }

  function ring(pct, color, size = 64) {
    const r = size / 2 - 6, c = size / 2, C = 2 * Math.PI * r;
    const len = (pct / 100) * C;
    return `<svg width="${size}" height="${size}">
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#EEEAE2" stroke-width="7"/>
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="7"
        stroke-dasharray="${len} ${C}" stroke-linecap="round" transform="rotate(-90 ${c} ${c})"/>
    </svg><div class="ring-txt">${pct}%</div>`;
  }

  function sparkline(values, color) {
    const W = 90, H = 38, max = Math.max(...values), min = Math.min(...values);
    const x = i => (i * W) / (values.length - 1);
    const y = v => H - 4 - (H - 8) * ((v - min) / (max - min || 1));
    const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <polygon points="0,${H} ${pts} ${W},${H}" fill="${color}" opacity=".12"/>
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  const trendBadge = (n) => n >= 0
    ? `<span class="kpi-trend up"><i class="fas fa-arrow-up"></i>${n}%</span>`
    : `<span class="kpi-trend down"><i class="fas fa-arrow-down"></i>${Math.abs(n)}%</span>`;
  const pctChange = (a, b) => +(((a - b) / b) * 100).toFixed(1);

  /* ============================================================
     1. TABLEAU DE BORD
     ============================================================ */
  function renderDashboard() {
    const k = D.kpis;
    const kpiCards = [
      { ico: "a", icon: "fa-euro-sign", label: "CA du jour", val: `${eur(k.ca.value)}<small> €</small>`, trend: pctChange(k.ca.value, k.ca.prev), spark: D.caWeek.real, color: "#D9743F" },
      { ico: "b", icon: "fa-receipt", label: "Ticket moyen", val: `${k.ticket.value.toFixed(2).replace(".", ",")}<small> €</small>`, trend: pctChange(k.ticket.value, k.ticket.prev), spark: [34, 36, 35, 37, 36, 38, 38.5], color: "#2E9E6B" },
      { ico: "c", icon: "fa-seedling", label: "Food cost", val: `${k.foodcost.value.toString().replace(".", ",")}<small> %</small>`, trend: -pctChange(k.foodcost.prev, k.foodcost.value), spark: [33, 32, 32, 31, 30, 30, 29.4], color: "#E8A53D", inv: true },
      { ico: "d", icon: "fa-chart-pie", label: "Marge brute", val: `${k.marge.value.toString().replace(".", ",")}<small> %</small>`, trend: pctChange(k.marge.value, k.marge.prev), spark: [64, 65, 66, 66, 67, 68, 68.2], color: "#3E7CB1" },
      { ico: "e", icon: "fa-users", label: "Couverts servis", val: `${k.couverts.value}`, trend: pctChange(k.couverts.value, k.couverts.prev), spark: [88, 96, 92, 104, 108, 118, 111], color: "#6b4ea0" },
      { ico: "f", icon: "fa-chair", label: "Taux de remplissage", val: `${k.remplissage.value}<small> %</small>`, trend: pctChange(k.remplissage.value, k.remplissage.prev), spark: [70, 74, 72, 80, 82, 90, 87], color: "#D94A3D" },
    ];

    const kpiHtml = kpiCards.map(c => `
      <div class="kpi">
        <div class="kpi-top">
          <div class="kpi-ico ${c.ico}"><i class="fas ${c.icon}"></i></div>
          ${trendBadge(c.trend)}
        </div>
        <div class="kpi-label">${c.label}</div>
        <div class="kpi-value">${c.val}</div>
        <div class="tiny muted">vs hier</div>
        ${sparkline(c.spark, c.color)}
      </div>`).join("");

    const alertsHtml = D.alerts.map(a => `
      <div class="alert ${a.level}">
        <div class="alert-ico"><i class="fas ${a.icon}"></i></div>
        <div class="alert-main">
          <div class="alert-title">${a.title}</div>
          <div class="alert-text">${a.text}</div>
          <div class="alert-time">${a.time}</div>
        </div>
        <button class="alert-action" data-toast="Action « ${a.action} » lancée">${a.action} →</button>
      </div>`).join("");

    const topHtml = D.topDishes.map((d, i) => `
      <div class="list-row">
        <div class="list-ico" style="background:var(--surface-2)">${["🥇","🥈","🥉","4","5"][i]}</div>
        <div class="list-main">
          <div class="list-title">${d.name}</div>
          <div class="list-sub">${d.sold} vendus · ${d.price.toFixed(2).replace(".",",")} €</div>
        </div>
        <div class="list-end">${trendBadge(d.trend)}</div>
      </div>`).join("");

    const splitLegend = D.caSplit.map(s => `
      <div class="li"><span class="sw" style="background:${s.color}"></span>${s.label}<span class="pct">${s.value}%</span></div>`).join("");

    return `
      <div class="grid cols-3" style="margin-bottom:18px">${kpiHtml}</div>

      <div class="grid cols-3">
        <div class="card span-2">
          <div class="card-head">
            <div><div class="card-title">Évolution du chiffre d'affaires</div>
            <div class="card-desc">Réel vs prévisionnel</div></div>
            <div class="seg" id="caRange">
              <button class="active" data-range="week">Semaine</button>
              <button data-range="month">Mois</button>
            </div>
          </div>
          <div id="caChart"></div>
          <div class="legend mt-16">
            <div class="legend-item"><span class="legend-swatch" style="background:#D9743F"></span>CA réel</div>
            <div class="legend-item"><span class="legend-swatch" style="background:#c9bfb0"></span>Prévisionnel</div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><div class="card-title">Répartition du CA</div></div>
          <div class="flex" style="align-items:center;gap:18px">
            <div>${donut(D.caSplit, 140)}</div>
            <div class="donut-legend">${splitLegend}</div>
          </div>
          <div class="ai-promo" style="margin-top:18px;padding:16px">
            <h3 style="font-size:15px">💡 Insight du jour</h3>
            <p style="margin:6px 0 0">Le service du soir génère 58 % du CA. Pensez à optimiser la rotation des tables entre 20 h et 21 h.</p>
          </div>
        </div>
      </div>

      <div class="grid cols-3" style="margin-top:18px">
        <div class="card span-2">
          <div class="card-head">
            <div><div class="card-title">🔔 Alertes intelligentes prioritaires</div>
            <div class="card-desc">Classées par urgence — l'IA surveille votre activité en continu</div></div>
            <span class="badge red"><i class="fas fa-circle"></i> 2 urgentes</span>
          </div>
          ${alertsHtml}
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">🍽️ Top plats du jour</div></div>
          <div class="list">${topHtml}</div>
        </div>
      </div>`;
  }

  function mountDashboard() {
    drawCaChart("week");
    $("#caRange") && $$("#caRange button").forEach(b => b.onclick = () => {
      $$("#caRange button").forEach(x => x.classList.remove("active"));
      b.classList.add("active"); drawCaChart(b.dataset.range);
    });
  }
  function drawCaChart(range) {
    const src = range === "month" ? D.caMonth : D.caWeek;
    $("#caChart").innerHTML = lineChart([
      { values: src.prev, color: "#c9bfb0", dash: true },
      { values: src.real, color: "#D9743F", fill: true },
    ], { labels: src.labels });
  }

  /* ============================================================
     2. PRÉVISION & AFFLUENCE
     ============================================================ */
  function renderForecast() {
    const f = D.forecast;
    const weather = f.days.map(d => `
      <div class="wcell ${d.peak ? "peak" : ""}">
        <div class="wd">${d.day} ${d.date}</div>
        <div class="wi">${d.icon}</div>
        <div class="wt">${d.temp}°</div>
        <div class="tiny muted">${d.covers} couv.</div>
        <div class="wc" style="color:${d.color}">${d.pct > 0 ? "+" : ""}${d.pct}%</div>
      </div>`).join("");

    const maxSlot = Math.max(...f.slots.covers);
    const slots = f.slots.labels.map((l, i) => {
      const h = (f.slots.covers[i] / maxSlot) * 100;
      const peak = f.slots.covers[i] === maxSlot;
      return `<div class="bar-col">
        <div class="bar-stack"><div class="bar" style="height:${h}%;${peak ? "background:linear-gradient(180deg,#E8A53D,#D9743F)" : ""}" title="${f.slots.covers[i]} couverts"></div></div>
        <div class="bar-label">${l}</div></div>`;
    }).join("");

    const drivers = f.drivers.map(d => `
      <div class="list-row">
        <div class="list-ico" style="background:${d.positive ? "var(--green-soft)" : "var(--blue-soft)"};color:${d.positive ? "#1d7a4f" : "#2c5d87"}"><i class="fas ${d.icon}"></i></div>
        <div class="list-main"><div class="list-title">${d.text}</div><div class="list-sub">${d.label}</div></div>
        <div class="list-end"><span class="badge ${d.positive ? "green" : "blue"}">${d.impact}</span></div>
      </div>`).join("");

    const prep = f.prep.map(p => `
      <tr>
        <td class="t-name">${p.name}</td>
        <td class="t-num">${p.qty}</td>
        <td><span class="badge ${p.level === "red" ? "red" : p.level === "amber" ? "amber" : "green"}">${p.note}</span></td>
      </tr>`).join("");

    return `
      <div class="card" style="margin-bottom:18px">
        <div class="card-head"><div><div class="card-title">Prévision d'affluence — 5 prochains jours</div>
          <div class="card-desc">Modèle basé sur la météo, les événements locaux et votre historique</div></div></div>
        <div class="weather-strip">${weather}</div>
      </div>

      <div class="grid cols-2">
        <div class="card">
          <div class="card-head"><div><div class="card-title">Affluence par créneau — Samedi</div>
            <div class="card-desc">Pic estimé à 20 h (46 couverts)</div></div>
            <span class="badge amber"><i class="fas fa-fire"></i> Jour de pointe</span></div>
          <div class="bars">${slots}</div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">Facteurs d'influence détectés</div></div>
          <div class="list">${drivers}</div>
        </div>
      </div>

      <div class="card" style="margin-top:18px">
        <div class="card-head"><div><div class="card-title">🎯 Quantités à préparer (recommandation IA)</div>
          <div class="card-desc">Pour réduire le gaspillage tout en couvrant l'affluence prévue</div></div>
          <button class="btn btn-primary btn-sm" data-toast="Liste de préparation envoyée en cuisine"><i class="fas fa-paper-plane"></i> Envoyer en cuisine</button></div>
        <table><thead><tr><th>Produit / Préparation</th><th>Quantité conseillée</th><th>Observation</th></tr></thead>
        <tbody>${prep}</tbody></table>
      </div>`;
  }

  /* ============================================================
     3. STOCKS & GASPILLAGE
     ============================================================ */
  function renderStock() {
    const s = D.stock;
    const cards = [
      { icon: "fa-boxes-stacked", c: "d", label: "Références suivies", val: s.summary.items },
      { icon: "fa-arrow-trend-down", c: "f", label: "Stocks bas", val: s.summary.low, badge: "À réapprovisionner" },
      { icon: "fa-hourglass-end", c: "c", label: "Proches DLC", val: s.summary.expiring, badge: "Sous 48 h" },
      { icon: "fa-recycle", c: "b", label: "Gaspillage / jour", val: s.summary.waste + " kg", badge: "-12 % ce mois" },
    ];
    const summ = cards.map(c => `
      <div class="kpi">
        <div class="kpi-top"><div class="kpi-ico ${c.c}"><i class="fas ${c.icon}"></i></div></div>
        <div class="kpi-label">${c.label}</div>
        <div class="kpi-value" style="font-size:24px">${c.val}</div>
        ${c.badge ? `<div class="tiny muted">${c.badge}</div>` : ""}
      </div>`).join("");

    const rows = s.items.map(it => `
      <tr>
        <td><span class="dot-status ${it.status}"></span> <span class="t-name">${it.name}</span></td>
        <td class="muted tiny">${it.cat}</td>
        <td class="t-num">${it.qty.toString().replace(".",",")} ${it.unit}</td>
        <td style="min-width:120px"><div class="meter ${it.status}"><span style="width:${it.level}%"></span></div></td>
        <td class="muted tiny">${it.dlc}</td>
        <td>${it.status === "red" ? '<span class="badge red">Commander</span>' : it.status === "amber" ? '<span class="badge amber">À surveiller</span>' : '<span class="badge green">OK</span>'}</td>
      </tr>`).join("");

    const maxW = Math.max(...s.waste.kg);
    const wasteBars = s.waste.labels.map((l, i) => `
      <div class="bar-col"><div class="bar-stack"><div class="bar prev" style="height:${(s.waste.kg[i]/maxW)*100}%;background:linear-gradient(180deg,#E8A53D,#D9743F)" title="${s.waste.kg[i]} kg"></div></div><div class="bar-label">${l}</div></div>`).join("");

    const tips = s.tips.map(t => `
      <div class="alert info" style="border-left-color:var(--green)">
        <div class="alert-ico" style="background:var(--green-soft);color:#1d7a4f"><i class="fas ${t.icon}"></i></div>
        <div class="alert-main"><div class="alert-text" style="font-size:13px">${t.text}</div></div>
      </div>`).join("");

    const wasteLegend = s.wasteSplit.map(w => `
      <div class="li"><span class="sw" style="background:${w.color}"></span>${w.label}<span class="pct">${w.value}%</span></div>`).join("");

    return `
      <div class="grid cols-4" style="margin-bottom:18px">${summ}</div>

      <div class="card" style="margin-bottom:18px">
        <div class="card-head"><div><div class="card-title">📦 État des stocks</div>
          <div class="card-desc">Niveaux en temps réel et alertes de réapprovisionnement</div></div>
          <button class="btn btn-ghost btn-sm" data-toast="Inventaire actualisé"><i class="fas fa-rotate"></i> Actualiser</button></div>
        <table><thead><tr><th>Produit</th><th>Catégorie</th><th>Quantité</th><th>Niveau</th><th>DLC</th><th>Statut</th></tr></thead>
        <tbody>${rows}</tbody></table>
      </div>

      <div class="grid cols-3">
        <div class="card span-2">
          <div class="card-head"><div><div class="card-title">Gaspillage de la semaine</div>
            <div class="card-desc">Total 27,2 kg · objectif &lt; 25 kg</div></div></div>
          <div class="bars">${wasteBars}</div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">Causes du gaspillage</div></div>
          <div class="flex" style="align-items:center;gap:16px">
            <div>${donut(s.wasteSplit, 130)}</div>
            <div class="donut-legend">${wasteLegend}</div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:18px">
        <div class="card-head"><div class="card-title">♻️ Suggestions de réduction (IA)</div></div>
        ${tips}
      </div>`;
  }

  /* ============================================================
     4. PLANNING DU PERSONNEL
     ============================================================ */
  function renderStaff() {
    const s = D.staff;
    const cards = [
      { icon: "fa-user-group", c: "d", label: "Employés actifs", val: s.summary.employees },
      { icon: "fa-clock", c: "e", label: "Heures / semaine", val: s.summary.hours + " h" },
      { icon: "fa-money-bill-wave", c: "a", label: "Coût main-d'œuvre", val: eur(s.summary.cost) + " €" },
      { icon: "fa-percent", c: "b", label: "Ratio masse sal. / CA", val: s.summary.ratio + " %", badge: "Cible &lt; 30 %" },
    ];
    const summ = cards.map(c => `
      <div class="kpi"><div class="kpi-top"><div class="kpi-ico ${c.c}"><i class="fas ${c.icon}"></i></div></div>
        <div class="kpi-label">${c.label}</div><div class="kpi-value" style="font-size:24px">${c.val}</div>
        ${c.badge ? `<div class="tiny muted">${c.badge}</div>` : ""}</div>`).join("");

    // grid header
    let grid = `<div class="staff-slot"></div>` + s.schedule.days.map(d => `<div class="staff-time center">${d}</div>`).join("");
    s.schedule.rows.forEach(r => {
      grid += `<div class="staff-time">${r.slot}</div>`;
      r.staff.forEach(n => {
        const intensity = n >= 4 ? "var(--accent)" : n >= 3 ? "var(--amber)" : "var(--green)";
        const bg = n >= 4 ? "var(--accent-soft)" : n >= 3 ? "var(--amber-soft)" : "var(--green-soft)";
        grid += `<div class="staff-slot" style="background:${bg};color:#3a2a12"><i class="fas fa-user" style="color:${intensity};font-size:10px"></i> ${n}</div>`;
      });
    });

    const team = s.team.map(t => `
      <div class="list-row">
        <div class="avatar" style="background:${t.color}">${t.name.split(" ").map(x=>x[0]).join("")}</div>
        <div class="list-main"><div class="list-title">${t.name}</div><div class="list-sub">${t.role}</div></div>
        <span class="badge green"><i class="fas fa-circle"></i> Planifié</span>
      </div>`).join("");

    return `
      <div class="grid cols-4" style="margin-bottom:18px">${summ}</div>

      <div class="card" style="margin-bottom:18px">
        <div class="card-head"><div><div class="card-title">🗓️ Planning généré automatiquement</div>
          <div class="card-desc">Effectif optimisé selon l'affluence prévue par créneau</div></div>
          <button class="btn btn-primary btn-sm" data-toast="Planning régénéré selon les prévisions"><i class="fas fa-wand-magic-sparkles"></i> Régénérer</button></div>
        <div class="staff-grid">${grid}</div>
        <div class="legend mt-16">
          <div class="legend-item"><span class="legend-swatch" style="background:var(--green)"></span>Effectif léger</div>
          <div class="legend-item"><span class="legend-swatch" style="background:var(--amber)"></span>Effectif moyen</div>
          <div class="legend-item"><span class="legend-swatch" style="background:var(--accent)"></span>Renfort (pic)</div>
        </div>
      </div>

      <div class="grid cols-3">
        <div class="card span-2">
          <div class="card-head"><div class="card-title">⚡ Optimisation recommandée</div></div>
          <div class="ai-promo">
            <h3>${s.recommendation.title}</h3>
            <p>${s.recommendation.text}</p>
            <div class="flex gap-12" style="position:relative;flex-wrap:wrap">
              <span class="badge amber">${s.recommendation.cost}</span>
              <span class="badge green">${s.recommendation.gain}</span>
            </div>
            <button class="btn btn-primary btn-sm" style="margin-top:14px;position:relative" data-toast="Renfort ajouté au planning de vendredi"><i class="fas fa-plus"></i> Ajouter le renfort</button>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">👥 Équipe</div></div>
          <div class="list">${team}</div>
        </div>
      </div>`;
  }

  /* ============================================================
     5. CARTE & RENTABILITÉ
     ============================================================ */
  function renderMenu() {
    const m = D.menu;
    // scatter-style matrix using simple positioning
    const rows = m.map(d => {
      const fc = Math.round((d.cost / d.price) * 100);
      const q = d.star ? '<span class="badge green"><i class="fas fa-star"></i> Vedette</span>'
        : d.margin < 55 || d.pop < 40 ? '<span class="badge red">À revoir</span>'
        : '<span class="badge gray">Standard</span>';
      return `<tr>
        <td class="t-name">${d.name}</td>
        <td class="muted tiny">${d.cat}</td>
        <td class="t-num">${d.price.toFixed(2).replace(".",",")} €</td>
        <td class="t-num">${fc}%</td>
        <td class="t-num">${d.margin}%</td>
        <td style="min-width:90px"><div class="meter"><span style="width:${d.pop}%"></span></div></td>
        <td class="t-num">${d.sold}</td>
        <td>${q}</td>
      </tr>`;
    }).join("");

    const actions = D.menuActions.map(a => `
      <div class="alert ${a.color === "green" ? "info" : a.color === "red" ? "high" : "medium"}" style="${a.color === "green" ? "border-left-color:var(--green)" : a.color === "accent" ? "border-left-color:var(--accent)" : ""}">
        <div class="alert-ico" style="${a.color === "green" ? "background:var(--green-soft);color:#1d7a4f" : a.color === "accent" ? "background:var(--accent-soft);color:var(--accent-deep)" : ""}"><i class="fas ${a.icon}"></i></div>
        <div class="alert-main"><div class="alert-title">${a.type}</div><div class="alert-text">${a.text}</div></div>
      </div>`).join("");

    // popularity vs margin quadrant
    const W = 100;
    const points = m.map(d => {
      const left = d.pop, bottom = d.margin;
      const color = d.star ? "#2E9E6B" : (d.margin < 55 || d.pop < 40) ? "#D94A3D" : "#E8A53D";
      return `<div title="${d.name}" style="position:absolute;left:${left}%;bottom:${(bottom-40)/0.6}%;transform:translate(-50%,50%);width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:var(--shadow-sm);cursor:pointer"></div>`;
    }).join("");

    return `
      <div class="grid cols-3" style="margin-bottom:18px">
        <div class="card">
          <div class="card-head"><div class="card-title">Marge brute moyenne</div></div>
          <div class="stat-inline"><span class="big">69,4 %</span>${trendBadge(2.1)}</div>
          <div class="tiny muted mt-8">Sur l'ensemble de la carte</div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">Plat le plus vendu</div></div>
          <div class="stat-inline"><span class="big">Magret</span></div>
          <div class="tiny muted mt-8">142 ventes ce mois · ⭐ plat-star</div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">Potentiel d'upselling</div></div>
          <div class="stat-inline"><span class="big">+18 %</span></div>
          <div class="tiny muted mt-8">Panier moyen avec suggestion vin</div>
        </div>
      </div>

      <div class="grid cols-3">
        <div class="card span-2">
          <div class="card-head"><div><div class="card-title">🍴 Analyse de rentabilité par plat</div>
            <div class="card-desc">Triés par marge et popularité</div></div></div>
          <table><thead><tr><th>Plat</th><th>Cat.</th><th>Prix</th><th>Food cost</th><th>Marge</th><th>Popularité</th><th>Ventes</th><th>Statut</th></tr></thead>
          <tbody>${rows}</tbody></table>
        </div>
        <div class="card">
          <div class="card-head"><div><div class="card-title">Matrice popularité / marge</div></div></div>
          <div style="position:relative;height:230px;margin:10px 16px 22px;border-left:2px solid var(--line);border-bottom:2px solid var(--line)">
            ${points}
            <span class="tiny muted" style="position:absolute;left:-2px;top:-18px">Marge ↑</span>
            <span class="tiny muted" style="position:absolute;right:0;bottom:-22px">Popularité →</span>
          </div>
          <div class="legend center" style="justify-content:center">
            <div class="legend-item"><span class="legend-swatch" style="background:#2E9E6B"></span>Vedettes</div>
            <div class="legend-item"><span class="legend-swatch" style="background:#E8A53D"></span>Standards</div>
            <div class="legend-item"><span class="legend-swatch" style="background:#D94A3D"></span>À revoir</div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:18px">
        <div class="card-head"><div class="card-title">💡 Recommandations d'ajustement & upselling</div></div>
        ${actions}
      </div>`;
  }

  /* ============================================================
     6. CLIENTS & AVIS
     ============================================================ */
  function renderReviews() {
    const r = D.reviews;
    const totalDist = r.distribution.reduce((a, d) => a + d.n, 0);
    const dist = r.distribution.map(d => `
      <div class="flex gap-12" style="align-items:center;margin:7px 0">
        <span class="tiny" style="width:34px">${d.s} ★</span>
        <div class="meter amber" style="flex:1"><span style="width:${(d.n/totalDist)*100}%"></span></div>
        <span class="tiny muted" style="width:42px;text-align:right">${d.n}</span>
      </div>`).join("");

    const themes = r.themes.map(t => `
      <div class="flex gap-12" style="align-items:center;margin:9px 0">
        <span class="tiny" style="width:140px">${t.label}</span>
        <div class="meter ${t.score>=85?"green":t.score>=72?"amber":"red"}" style="flex:1"><span style="width:${t.score}%"></span></div>
        <span class="tiny t-num" style="width:54px;text-align:right">${t.score}/100 ${t.trend==="up"?"↗":t.trend==="down"?"↘":"→"}</span>
      </div>`).join("");

    const sentLegend = r.sentiment.map(sv => `<div class="li"><span class="sw" style="background:${sv.color}"></span>${sv.label}<span class="pct">${sv.value}%</span></div>`).join("");

    const reviews = r.list.map((rv, i) => `
      <div class="review-card" style="margin-bottom:12px">
        <div class="between" style="margin-bottom:8px">
          <div class="flex gap-8" style="align-items:center">
            <span class="source-pill ${rv.source}">${rv.source === "google" ? "Google" : rv.source === "tripadvisor" ? "TripAdvisor" : "TheFork"}</span>
            <strong style="font-size:13.5px">${rv.name}</strong>
            <span class="stars">${"★".repeat(rv.stars)}${"☆".repeat(5-rv.stars)}</span>
          </div>
          <span class="badge ${rv.sentiment}">${rv.sentiment==="green"?"Positif":"Négatif"}</span>
        </div>
        <div class="tiny muted" style="margin-bottom:8px">${rv.date}</div>
        <div style="font-size:13.5px;color:var(--text)">${rv.text}</div>
        <div class="mini-card" style="margin-top:11px;background:var(--surface);border:1px solid var(--line-2);padding:12px;border-radius:11px">
          <div class="tiny" style="font-weight:700;color:var(--accent-deep);margin-bottom:5px"><i class="fas fa-robot"></i> Réponse générée par l'IA</div>
          <div style="font-size:13px;color:var(--text-2)" id="reply-${i}">${rv.reply}</div>
          <button class="btn btn-primary btn-sm" style="margin-top:10px" data-toast="Réponse publiée sur ${rv.source}"><i class="fas fa-paper-plane"></i> Publier la réponse</button>
        </div>
      </div>`).join("");

    return `
      <div class="grid cols-4" style="margin-bottom:18px">
        <div class="kpi"><div class="kpi-top"><div class="kpi-ico c"><i class="fas fa-star"></i></div></div>
          <div class="kpi-label">Note moyenne</div><div class="kpi-value">${r.summary.rating.toString().replace(".",",")}<small> / 5</small></div>
          <div class="tiny muted">${eur(r.summary.total)} avis</div></div>
        <div class="kpi"><div class="kpi-top"><div class="kpi-ico b"><i class="fas fa-face-smile"></i></div></div>
          <div class="kpi-label">Sentiment positif</div><div class="kpi-value">${r.summary.sentiment}<small> %</small></div>
          <div class="tiny muted">+4 pts ce mois</div></div>
        <div class="kpi"><div class="kpi-top"><div class="kpi-ico d"><i class="fas fa-reply"></i></div></div>
          <div class="kpi-label">Taux de réponse</div><div class="kpi-value">${r.summary.response}<small> %</small></div>
          <div class="tiny muted">via réponses IA</div></div>
        <div class="kpi"><div class="kpi-top"><div class="kpi-ico f"><i class="fas fa-heart-crack"></i></div></div>
          <div class="kpi-label">Clients à risque (churn)</div><div class="kpi-value">${r.loyalty.churnRisk}</div>
          <div class="tiny muted">Relance fidélité suggérée</div></div>
      </div>

      <div class="grid cols-3" style="margin-bottom:18px">
        <div class="card">
          <div class="card-head"><div class="card-title">Distribution des notes</div></div>
          ${dist}
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">Analyse de sentiment</div></div>
          <div class="flex" style="align-items:center;gap:16px">
            <div>${donut(r.sentiment, 130)}</div>
            <div class="donut-legend">${sentLegend}</div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">Thèmes récurrents</div></div>
          ${themes}
        </div>
      </div>

      <div class="grid cols-2">
        <div class="card">
          <div class="card-head"><div><div class="card-title">💬 Avis récents & réponses IA</div>
            <div class="card-desc">Réponses personnalisées prêtes à publier</div></div></div>
          ${reviews}
        </div>
        <div>
          <div class="card" style="margin-bottom:18px">
            <div class="card-head"><div class="card-title">❤️ Fidélisation</div></div>
            <div class="grid cols-2" style="gap:14px">
              <div><div class="kpi-label">Membres fidélité</div><div class="kpi-value" style="font-size:24px">${eur(r.loyalty.members)}</div></div>
              <div><div class="kpi-label">Taux de retour</div><div class="kpi-value" style="font-size:24px">${r.loyalty.returning}<small> %</small></div></div>
            </div>
            <div class="meter green mt-16"><span style="width:${r.loyalty.returning}%"></span></div>
            <div class="tiny muted mt-8">38 % des clients reviennent dans les 30 jours — au-dessus de la moyenne du secteur (29 %).</div>
          </div>
          <div class="card ai-promo">
            <h3>🎁 Action suggérée</h3>
            <p>47 clients fidèles n'ont pas réservé depuis 60 jours. Une offre « -15 % sur le menu découverte » pourrait en réactiver une partie.</p>
            <button class="btn btn-primary btn-sm" style="position:relative" data-toast="Campagne de réactivation programmée"><i class="fas fa-paper-plane"></i> Lancer la campagne</button>
          </div>
        </div>
      </div>`;
  }

  /* ============================================================
     7. ASSISTANT IA
     ============================================================ */
  function renderAI() {
    const sugg = D.aiSuggestions.map(s => `<button class="chip-suggest" data-q="${s}">${s}</button>`).join("");
    return `
      <div class="card card-pad-lg">
        <div class="chat-shell">
          <div class="chat-stream" id="chatStream"></div>
          <div class="suggestions" id="suggestions">${sugg}</div>
          <div class="composer">
            <input id="chatInput" placeholder="Posez votre question… ex : « Que dois-je commander pour ce week-end ? »" autocomplete="off"/>
            <button class="send" id="chatSend"><i class="fas fa-arrow-up"></i></button>
          </div>
        </div>
      </div>`;
  }

  function mountAI() {
    const stream = $("#chatStream");
    const input = $("#chatInput");
    const send = $("#chatSend");
    let booted = stream.dataset.booted;

    function addMsg(role, html) {
      const m = el("div", `msg ${role}`);
      m.innerHTML = `<div class="msg-av">${role === "ai" ? '<i class="fas fa-robot"></i>' : 'O'}</div><div class="bubble">${html}</div>`;
      stream.appendChild(m); stream.scrollTop = stream.scrollHeight; return m;
    }
    function answer(q) {
      const ql = q.toLowerCase();
      const hit = D.aiKnowledge.find(k => k.match.some(m => ql.includes(m)));
      return hit ? hit.html : D.aiFallback;
    }
    function ask(q) {
      addMsg("user", q);
      const t = addMsg("ai", `<div class="typing"><span></span><span></span><span></span></div>`);
      setTimeout(() => { t.querySelector(".bubble").innerHTML = answer(q); stream.scrollTop = stream.scrollHeight; }, 750 + Math.random() * 500);
    }

    if (!booted) {
      addMsg("ai", `Bonjour Olivier 👋 Je suis votre <strong>copilote Resto Pilot</strong>. J'ai analysé votre activité du jour : <strong>CA 4 280 €</strong> (+9,5 %), tout va bien ! ⚠️ Pensez à commander le <strong>saumon</strong> avant 16 h. Comment puis-je vous aider ?`);
      stream.dataset.booted = "1";
    }

    const handler = () => { const v = input.value.trim(); if (!v) return; input.value = ""; ask(v); };
    send.onclick = handler;
    input.onkeydown = e => { if (e.key === "Enter") handler(); };
    $$("#suggestions .chip-suggest").forEach(c => c.onclick = () => ask(c.dataset.q));
    setTimeout(() => input.focus(), 100);
  }

  /* ============================================================
     ROUTER
     ============================================================ */
  const PAGES = {
    dashboard: { title: "Tableau de bord", sub: "Vue d'ensemble en temps réel — Aujourd'hui, jeudi 19 juin", render: renderDashboard, mount: mountDashboard },
    forecast:  { title: "Prévision & affluence", sub: "Anticipez votre activité et préparez les bonnes quantités", render: renderForecast },
    stock:     { title: "Stocks & gaspillage", sub: "Suivi en temps réel et réduction du gâchis", render: renderStock },
    staff:     { title: "Planning du personnel", sub: "Effectif optimisé selon l'affluence prévue", render: renderStaff },
    menu:      { title: "Carte & rentabilité", sub: "Analyse de la marge et de la popularité de vos plats", render: renderMenu },
    reviews:   { title: "Clients & avis", sub: "Réputation en ligne, sentiment et fidélisation", render: renderReviews },
    assistant: { title: "Assistant IA", sub: "Posez vos questions en langage naturel, recevez des recommandations chiffrées", render: renderAI, mount: mountAI },
  };

  function navigate(key) {
    const p = PAGES[key]; if (!p) return;
    $("#pageTitle").textContent = p.title;
    $("#pageSub").textContent = p.sub;
    $("#content").innerHTML = p.render();
    if (p.mount) p.mount();
    $$(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.nav === key));
    window.scrollTo({ top: 0, behavior: "smooth" });
    closeSidebar();
    location.hash = key;
  }

  /* ---------- sidebar mobile ---------- */
  function openSidebar() { $(".sidebar").classList.add("open"); $("#overlay").classList.add("show"); }
  function closeSidebar() { $(".sidebar").classList.remove("open"); $("#overlay").classList.remove("show"); }

  /* ---------- toast ---------- */
  let toastT;
  function toast(msg) {
    let t = $("#toast"); if (!t) { t = el("div", "toast"); t.id = "toast"; document.body.appendChild(t); }
    t.innerHTML = `<i class="fas fa-circle-check"></i> ${msg}`;
    t.classList.add("show"); clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("show"), 2600);
  }

  /* ---------- init ---------- */
  document.addEventListener("click", e => {
    const nav = e.target.closest("[data-nav]"); if (nav) { navigate(nav.dataset.nav); return; }
    const tb = e.target.closest("[data-toast]"); if (tb) { toast(tb.dataset.toast); return; }
    if (e.target.closest("#burger")) openSidebar();
    if (e.target.closest("#overlay")) closeSidebar();
    if (e.target.closest("#askAi")) navigate("assistant");
  });

  const start = (location.hash || "#dashboard").slice(1);
  navigate(PAGES[start] ? start : "dashboard");
  window.addEventListener("hashchange", () => {
    const k = location.hash.slice(1); if (PAGES[k]) navigate(k);
  });
})();
