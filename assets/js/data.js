/* ============================================================
   RESTO PILOT — Données fictives réalistes
   Restaurant « La Table d'Olivier » — bistrot français, 64 couverts
   ============================================================ */
window.RP = {
  restaurant: {
    name: "La Table d'Olivier",
    type: "Bistrot français · 64 couverts",
    city: "Lyon 2ᵉ",
  },

  /* ---------- KPIs du jour ---------- */
  kpis: {
    ca:        { value: 4280, prev: 3910, unit: "€" },
    ticket:    { value: 38.5, prev: 36.2, unit: "€" },
    foodcost:  { value: 29.4, target: 30, prev: 31.8, unit: "%" },
    marge:     { value: 68.2, prev: 66.5, unit: "%" },
    couverts:  { value: 111, prev: 108, unit: "" },
    remplissage:{ value: 87, prev: 79, unit: "%" },
  },

  /* ---------- CA semaine (réel vs prévu) ---------- */
  caWeek: {
    labels: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
    real:   [2980, 3240, 3110, 3680, 4280, 5120, 4650],
    prev:   [3050, 3180, 3200, 3550, 4100, 5400, 4900],
  },
  caMonth: {
    labels: ["S1", "S2", "S3", "S4"],
    real:   [21800, 23400, 22100, 27050],
    prev:   [22000, 22500, 23000, 26500],
  },

  /* ---------- Répartition CA par service ---------- */
  caSplit: [
    { label: "Service du soir", value: 58, color: "#D9743F" },
    { label: "Déjeuner",        value: 31, color: "#E8A53D" },
    { label: "À emporter",      value: 11, color: "#2E9E6B" },
  ],

  /* ---------- Alertes intelligentes ---------- */
  alerts: [
    { level: "high",   icon: "fa-triangle-exclamation", title: "Rupture imminente — Saumon frais",
      text: "Stock à 2,1 kg. Vendredi soir prévu à +24 % d'affluence. Commande conseillée avant 16 h.",
      time: "Il y a 12 min", action: "Commander" },
    { level: "high",   icon: "fa-temperature-three-quarters", title: "Food cost « Burgers » en hausse",
      text: "Le coût matière du Burger Signature atteint 38 % (cible 32 %). Hausse du prix du bœuf détectée.",
      time: "Il y a 1 h", action: "Analyser" },
    { level: "medium", icon: "fa-cloud-sun-rain", title: "Pic d'affluence prévu samedi",
      text: "Beau temps + match au Groupama Stadium. Affluence estimée +31 %. Prévoir un renfort en salle.",
      time: "Il y a 2 h", action: "Voir planning" },
    { level: "medium", icon: "fa-hourglass-half", title: "Surstock — Crème fraîche",
      text: "1,8 kg proche de la DLC (J+2). Suggestion : plat du jour « Gratin dauphinois » pour écouler.",
      time: "Il y a 3 h", action: "Suggérer" },
    { level: "info",   icon: "fa-star", title: "Nouvel avis Google — 5 ★",
      text: "« Service impeccable et magret parfait. » Une réponse personnalisée est prête à être envoyée.",
      time: "Il y a 4 h", action: "Répondre" },
  ],

  /* ---------- Plats les plus vendus aujourd'hui ---------- */
  topDishes: [
    { name: "Magret de canard, miel & thym", sold: 23, price: 24.5, trend: +12 },
    { name: "Burger Signature maison",        sold: 19, price: 18.0, trend: +4 },
    { name: "Risotto crémeux aux cèpes",      sold: 17, price: 19.5, trend: -3 },
    { name: "Tartare de bœuf au couteau",     sold: 14, price: 21.0, trend: +8 },
    { name: "Filet de daurade, écrasé citron",sold: 11, price: 23.0, trend: +1 },
  ],

  /* ============================================================
     PRÉVISION & AFFLUENCE
     ============================================================ */
  forecast: {
    days: [
      { day: "Jeu", date: "19/06", icon: "☀️", temp: 27, cond: "Ensoleillé", level: "Normal", covers: 96,  pct: 0,  peak: false, color: "var(--text-2)" },
      { day: "Ven", date: "20/06", icon: "🌤️", temp: 26, cond: "Éclaircies", level: "Élevé", covers: 124, pct: 24, peak: true,  color: "var(--accent-deep)" },
      { day: "Sam", date: "21/06", icon: "☀️", temp: 29, cond: "Ensoleillé", level: "Très élevé", covers: 142, pct: 31, peak: true, color: "var(--red)" },
      { day: "Dim", date: "22/06", icon: "⛅", temp: 24, cond: "Nuageux",   level: "Élevé", covers: 118, pct: 18, peak: true,  color: "var(--accent-deep)" },
      { day: "Lun", date: "23/06", icon: "🌧️", temp: 19, cond: "Pluie",     level: "Faible", covers: 58,  pct: -22, peak: false, color: "var(--blue)" },
    ],
    slots: {
      labels: ["12h", "13h", "14h", "19h", "20h", "21h", "22h"],
      covers: [22, 38, 16, 28, 46, 41, 19],
    },
    drivers: [
      { icon: "fa-cloud-sun", label: "Météo", text: "Beau temps week-end", impact: "+14 %", positive: true },
      { icon: "fa-futbol",    label: "Événement", text: "Match OL · Sam 21 h", impact: "+11 %", positive: true },
      { icon: "fa-calendar-week", label: "Historique", text: "Tendance même période", impact: "+6 %", positive: true },
      { icon: "fa-cloud-rain", label: "Météo", text: "Pluie annoncée lundi", impact: "-22 %", positive: false },
    ],
    prep: [
      { name: "Magret de canard", qty: "32 portions", note: "+8 vs normal", level: "amber" },
      { name: "Pâte à burger (steaks)", qty: "26 pièces", note: "Affluence ↑", level: "amber" },
      { name: "Base risotto / cèpes", qty: "18 portions", note: "Stable", level: "green" },
      { name: "Pâte à tarte (dessert)", qty: "3 plaques", note: "Réduire de 1", level: "green" },
      { name: "Saumon frais", qty: "9 kg à commander", note: "Rupture prévue", level: "red" },
    ],
  },

  /* ============================================================
     STOCKS & GASPILLAGE
     ============================================================ */
  stock: {
    summary: { items: 142, low: 7, expiring: 4, waste: 3.8 },
    items: [
      { name: "Saumon frais",        cat: "Poisson",  qty: 2.1,  unit: "kg", level: 11, status: "red",   dlc: "21/06" },
      { name: "Magret de canard",    cat: "Viande",   qty: 8.4,  unit: "kg", level: 46, status: "amber", dlc: "23/06" },
      { name: "Bœuf haché (steaks)", cat: "Viande",   qty: 14.0, unit: "kg", level: 72, status: "green", dlc: "22/06" },
      { name: "Crème fraîche",       cat: "Crémerie", qty: 1.8,  unit: "kg", level: 88, status: "amber", dlc: "21/06" },
      { name: "Cèpes",               cat: "Légumes",  qty: 0.9,  unit: "kg", level: 18, status: "red",   dlc: "20/06" },
      { name: "Pommes de terre",     cat: "Légumes",  qty: 28.0, unit: "kg", level: 81, status: "green", dlc: "30/06" },
      { name: "Beurre AOP",          cat: "Crémerie", qty: 6.2,  unit: "kg", level: 64, status: "green", dlc: "28/06" },
      { name: "Vin rouge (Côtes)",   cat: "Cave",     qty: 42,   unit: "btl",level: 70, status: "green", dlc: "—" },
    ],
    waste: {
      labels: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
      kg:     [4.2, 3.8, 5.1, 3.2, 2.9, 4.6, 3.4],
    },
    wasteSplit: [
      { label: "Surproduction", value: 42, color: "#D9743F" },
      { label: "Péremption",    value: 31, color: "#E8A53D" },
      { label: "Retours client",value: 16, color: "#3E7CB1" },
      { label: "Préparation",   value: 11, color: "#2E9E6B" },
    ],
    tips: [
      { icon: "fa-utensils",   text: "Proposer un « Gratin dauphinois » en plat du jour pour écouler 1,8 kg de crème (DLC J+2)." },
      { icon: "fa-arrow-down", text: "Réduire la production de risotto le lundi (-22 % d'affluence prévue) : ~6 portions économisées." },
      { icon: "fa-tags",       text: "Mettre les cèpes en suggestion ce soir : 0,9 kg à valoriser avant demain." },
    ],
  },

  /* ============================================================
     PLANNING DU PERSONNEL
     ============================================================ */
  staff: {
    summary: { employees: 11, hours: 218, cost: 4120, ratio: 21.3 },
    team: [
      { name: "Olivier M.", role: "Chef", color: "#D9743F" },
      { name: "Sarah B.",   role: "Second", color: "#E8A53D" },
      { name: "Karim T.",   role: "Salle", color: "#2E9E6B" },
      { name: "Léa D.",     role: "Salle", color: "#3E7CB1" },
      { name: "Hugo P.",    role: "Plonge", color: "#6b4ea0" },
    ],
    schedule: {
      days: ["Lun", "Mar", "Mer", "Jeu", "Ven"],
      rows: [
        { slot: "Midi", staff: [2, 3, 3, 3, 4] },
        { slot: "Coupure", staff: [1, 1, 1, 1, 1] },
        { slot: "Soir", staff: [3, 3, 4, 4, 5] },
      ],
    },
    recommendation: {
      title: "Optimisation suggérée — Vendredi soir",
      text: "Affluence prévue +24 %. Ajouter 1 renfort en salle (19 h–23 h) couvrirait le pic sans dégrader le service.",
      cost: "+72 € de main-d'œuvre", gain: "≈ +540 € de CA potentiel",
    },
  },

  /* ============================================================
     CARTE & RENTABILITÉ
     ============================================================ */
  menu: [
    { name: "Magret de canard",      cat: "Plat",    price: 24.5, cost: 7.1,  sold: 142, margin: 71, pop: 92, star: true },
    { name: "Tartare de bœuf",       cat: "Plat",    price: 21.0, cost: 6.3,  sold: 88,  margin: 70, pop: 74, star: true },
    { name: "Risotto aux cèpes",     cat: "Plat",    price: 19.5, cost: 5.0,  sold: 96,  margin: 74, pop: 78, star: true },
    { name: "Burger Signature",      cat: "Plat",    price: 18.0, cost: 6.8,  sold: 118, margin: 62, pop: 88, star: false },
    { name: "Filet de daurade",      cat: "Plat",    price: 23.0, cost: 9.2,  sold: 41,  margin: 60, pop: 38, star: false },
    { name: "Salade César",          cat: "Entrée",  price: 13.5, cost: 3.1,  sold: 64,  margin: 77, pop: 58, star: true },
    { name: "Foie gras maison",      cat: "Entrée",  price: 16.0, cost: 8.4,  sold: 22,  margin: 47, pop: 24, star: false },
    { name: "Tiramisu maison",       cat: "Dessert", price: 8.5,  cost: 1.6,  sold: 102, margin: 81, pop: 84, star: true },
    { name: "Crème brûlée",          cat: "Dessert", price: 8.0,  cost: 1.4,  sold: 71,  margin: 82, pop: 62, star: true },
    { name: "Café gourmand",         cat: "Dessert", price: 9.0,  cost: 2.7,  sold: 33,  margin: 70, pop: 30, star: false },
  ],
  menuActions: [
    { icon: "fa-arrow-trend-up", type: "Vedette", color: "green",
      text: "Le Magret de canard est votre plat-star (forte marge + forte popularité). Mettez-le en avant en suggestion." },
    { icon: "fa-pen-ruler", type: "À retravailler", color: "amber",
      text: "Le Foie gras : faible marge (47 %) et faible popularité. Renégocier le fournisseur ou revoir le prix à 18 €." },
    { icon: "fa-bullhorn", type: "Upselling", color: "accent",
      text: "Suggérer un verre de Côtes-du-Rhône (+6,5 €) avec le Magret : +18 % de panier sur ce plat en test." },
    { icon: "fa-scissors", type: "À retirer ?", color: "red",
      text: "Le Filet de daurade plombe le food cost (40 %) pour seulement 41 ventes/mois. Envisager un remplacement." },
  ],

  /* ============================================================
     CLIENTS & AVIS
     ============================================================ */
  reviews: {
    summary: { rating: 4.6, total: 1284, response: 92, sentiment: 86 },
    distribution: [ {s:5,n:812},{s:4,n:286},{s:3,n:104},{s:2,n:48},{s:1,n:34} ],
    sentiment: [
      { label: "Positif", value: 86, color: "#2E9E6B" },
      { label: "Neutre",  value: 9,  color: "#E8A53D" },
      { label: "Négatif", value: 5,  color: "#D94A3D" },
    ],
    themes: [
      { label: "Cuisine / goût", score: 94, trend: "up" },
      { label: "Service", score: 88, trend: "up" },
      { label: "Ambiance", score: 91, trend: "flat" },
      { label: "Rapport qualité-prix", score: 76, trend: "down" },
      { label: "Temps d'attente", score: 68, trend: "down" },
    ],
    list: [
      { source: "google", name: "Camille R.", stars: 5, sentiment: "green", date: "Aujourd'hui",
        text: "Service impeccable et magret parfaitement cuit. On reviendra sans hésiter !",
        reply: "Merci infiniment Camille ! Ravis que le magret vous ait séduit. Olivier et toute l'équipe vous attendent avec plaisir. 🍷" },
      { source: "tripadvisor", name: "Mark T.", stars: 4, sentiment: "green", date: "Hier",
        text: "Très bonne cuisine, ambiance chaleureuse. Service un peu long le samedi soir.",
        reply: "Merci pour votre retour Mark ! Nous renforçons justement l'équipe le samedi pour fluidifier le service. Au plaisir de vous revoir." },
      { source: "thefork", name: "Sophie L.", stars: 2, sentiment: "red", date: "Il y a 2 j",
        text: "Plats savoureux mais 35 min d'attente entre l'entrée et le plat. Dommage.",
        reply: "Bonjour Sophie, nous sommes navrés pour cette attente. Vous avez raison, ce n'est pas notre standard. Nous aimerions vous réinviter — contactez-nous en MP. Merci de votre franchise." },
    ],
    loyalty: { members: 642, returning: 38, churnRisk: 47 },
  },

  /* ============================================================
     ASSISTANT IA — base de connaissances (réponses scriptées)
     ============================================================ */
  aiSuggestions: [
    "Que dois-je commander pour ce week-end ?",
    "Quel plat est le plus rentable ?",
    "Comment réduire mon gaspillage ?",
    "Ai-je assez de personnel pour samedi ?",
  ],
  aiKnowledge: [
    {
      match: ["command", "week-end", "weekend", "achat", "approvision", "stock"],
      html: `Pour le <strong>week-end</strong> (affluence prévue <strong>+27 %</strong> vs normale), voici ma recommandation chiffrée :
        <div class="mini-card">
          <div class="kv"><span>🐟 Saumon frais</span><b>9 kg</b></div>
          <div class="kv"><span>🦆 Magret de canard</span><b>12 kg</b></div>
          <div class="kv"><span>🍄 Cèpes</span><b>4 kg</b></div>
          <div class="kv"><span>🥩 Bœuf haché (steaks)</span><b>8 kg</b></div>
        </div>
        ⚠️ Le <strong>saumon</strong> est en rupture imminente — à commander <strong>avant 16 h aujourd'hui</strong>. Budget estimé : <strong>~410 €</strong>, pour un CA week-end projeté de <strong>~14 800 €</strong>.`,
    },
    {
      match: ["rentable", "marge", "plat star", "meilleur plat", "rentabilit"],
      html: `Votre plat le plus rentable est le <strong>Risotto aux cèpes</strong> : marge de <strong>74 %</strong> (coût 5,00 € / prix 19,50 €).
        <div class="mini-card">
          <div class="kv"><span>🥇 Risotto aux cèpes</span><b>74 % de marge</b></div>
          <div class="kv"><span>🥈 Crème brûlée</span><b>82 % · faible volume</b></div>
          <div class="kv"><span>🥉 Magret de canard</span><b>71 % · plat-star ⭐</b></div>
        </div>
        💡 Le <strong>Magret</strong> reste votre meilleur combo marge + popularité. À l'inverse, le <strong>Foie gras</strong> (47 %) est à retravailler.`,
    },
    {
      match: ["gaspillage", "gâchis", "perte", "déchet", "waste", "réduire"],
      html: `Votre gaspillage moyen est de <strong>3,8 kg/jour</strong> (-12 % ce mois 👍). Principales causes : <strong>surproduction (42 %)</strong> et péremption (31 %).
        <ul>
          <li>Écouler <strong>1,8 kg de crème</strong> (DLC J+2) via un gratin en plat du jour</li>
          <li>Réduire le risotto le lundi (-22 % d'affluence) : ~6 portions sauvées</li>
          <li>Valoriser les <strong>cèpes</strong> ce soir en suggestion</li>
        </ul>
        Économie potentielle : <strong>~38 €/semaine</strong>.`,
    },
    {
      match: ["personnel", "équipe", "planning", "samedi", "renfort", "staff", "employé"],
      html: `Pour <strong>samedi</strong> (affluence <strong>+31 %</strong>, ~142 couverts), votre effectif actuel est <strong>légèrement sous-dimensionné</strong> en salle.
        <div class="mini-card">
          <div class="kv"><span>Cuisine</span><b>✅ Suffisant (4 pers.)</b></div>
          <div class="kv"><span>Salle</span><b>⚠️ +1 renfort conseillé</b></div>
          <div class="kv"><span>Coût du renfort</span><b>+72 €</b></div>
          <div class="kv"><span>CA additionnel estimé</span><b>+540 €</b></div>
        </div>
        Je recommande d'ajouter <strong>1 serveur de 19 h à 23 h</strong>. Le retour sur investissement est largement positif.`,
    },
    {
      match: ["food cost", "coût matière", "cout matiere", "burger"],
      html: `Votre <strong>food cost global</strong> est de <strong>29,4 %</strong> (sous la cible de 30 % ✅). Mais attention :
        <ul>
          <li>🍔 <strong>Burger Signature</strong> : 38 % — hausse du prix du bœuf. Ajuster le prix à 19 € ou réduire le grammage.</li>
          <li>🐟 <strong>Filet de daurade</strong> : 40 % pour peu de ventes — candidat au retrait.</li>
        </ul>
        Corriger ces deux plats ramènerait le food cost global vers <strong>28,1 %</strong>.`,
    },
    {
      match: ["chiffre", "ca ", "ventes", "vente", "journée", "aujourd", "résultat"],
      html: `Aujourd'hui, le <strong>CA est de 4 280 €</strong> (+9,5 % vs hier ✅) pour <strong>111 couverts</strong> et un ticket moyen de <strong>38,50 €</strong>.
        <div class="mini-card">
          <div class="kv"><span>Service du soir</span><b>58 % du CA</b></div>
          <div class="kv"><span>Plat n°1</span><b>Magret (23 ventes)</b></div>
          <div class="kv"><span>Taux de remplissage</span><b>87 %</b></div>
        </div>
        Belle journée — portée par le beau temps et le service du soir.`,
    },
    {
      match: ["avis", "client", "note", "google", "réputation", "satisfaction"],
      html: `Votre note moyenne est de <strong>4,6 ★</strong> sur 1 284 avis, avec <strong>86 % de sentiment positif</strong>.
        <ul>
          <li>👍 Points forts : <strong>cuisine (94)</strong> et ambiance (91)</li>
          <li>👀 À surveiller : <strong>temps d'attente (68)</strong>, en baisse</li>
        </ul>
        Un avis 2★ de Sophie L. mentionne l'attente : une réponse personnalisée est prête à envoyer. <strong>47 clients</strong> sont à risque de churn — une relance fidélité est suggérée.`,
    },
  ],
  aiFallback: `Bonne question ! Je peux vous aider sur : les <strong>commandes & stocks</strong>, la <strong>rentabilité des plats</strong>, le <strong>gaspillage</strong>, le <strong>planning du personnel</strong>, le <strong>food cost</strong> et les <strong>avis clients</strong>. Essayez par exemple : « Que dois-je commander pour ce week-end ? » ou cliquez sur une suggestion ci-dessous.`,
};
