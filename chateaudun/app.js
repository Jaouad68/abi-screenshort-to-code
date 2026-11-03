(function () {
  "use strict";

  /* ---------- Champ d'étoiles (box-shadow générés, graine fixe) ---------- */
  var seed = 1870;
  function rand() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function starField(n) {
    var w = Math.max(window.innerWidth, 1600), h = Math.max(window.innerHeight, 1200), out = [];
    for (var i = 0; i < n; i++) out.push(Math.round(rand() * w) + "px " + Math.round(rand() * h) + "px 0 0 #fff");
    return out.join(",");
  }
  [[".s1", 260], [".s2", 110], [".s3", 50]].forEach(function (l) {
    var el = document.querySelector(".stars " + l[0]);
    if (el) el.style.boxShadow = starField(l[1]);
  });

  /* ---------- Menu mobile ---------- */
  var burger = document.getElementById("burger");
  var links = document.getElementById("nav-links");
  function closeMenu() { links.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "Ouvrir le menu"); }
  burger.addEventListener("click", function () {
    var open = links.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
  });
  links.addEventListener("click", function (e) { if (e.target.tagName === "A") closeMenu(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });

  /* Lien actif selon la section visible */
  var navAnchors = Array.prototype.slice.call(links.querySelectorAll("a"));
  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navAnchors.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    navAnchors.forEach(function (a) { var s = document.querySelector(a.getAttribute("href")); if (s) spy.observe(s); });
  }

  /* ---------- Date du jour ---------- */
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var fmtLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  var d = fmtLong.format(today);
  document.getElementById("sc-date").textContent = d.charAt(0).toUpperCase() + d.slice(1);

  /* ---------- Agenda (exemples, dates relatives à aujourd'hui) ---------- */
  function addDays(n) { var x = new Date(today); x.setDate(x.getDate() + n); return x; }
  var EVENTS = [
    { j: 2,  cat: "marche",  label: "Marché", title: "Marché du centre-ville", place: "Place du 18-Octobre" },
    { j: 5,  cat: "culture", label: "Culture", title: "Visite nocturne du château", place: "Château de Châteaudun" },
    { j: 8,  cat: "famille", label: "Famille", title: "Heure du conte pour les 4-8 ans", place: "Médiathèque" },
    { j: 12, cat: "sport",   label: "Sport", title: "Course des bords du Loir", place: "Berges du Loir" },
    { j: 15, cat: "culture", label: "Culture", title: "Concert à la Sainte-Chapelle", place: "Château de Châteaudun" },
    { j: 19, cat: "famille", label: "Famille", title: "Atelier géodes et minéraux", place: "Grottes du Foulon" },
    { j: 23, cat: "marche",  label: "Marché", title: "Marché des producteurs du Dunois", place: "Place du 18-Octobre" },
    { j: 27, cat: "culture", label: "Culture", title: "Exposition : oiseaux du monde", place: "Musée des Beaux-Arts et d'Histoire naturelle" },
    { j: 34, cat: "sport",   label: "Sport", title: "Initiation canoë sur le Loir", place: "Base nautique" }
  ].map(function (e) { e.date = addDays(e.j); e.key = keyOf(e.date); return e; });

  function keyOf(dt) { return dt.getFullYear() + "-" + (dt.getMonth() + 1) + "-" + dt.getDate(); }
  var fmtMonthShort = new Intl.DateTimeFormat("fr-FR", { month: "short" });
  var fmtWeekday = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  var eventsEl = document.getElementById("events");
  var currentFilter = "tous";

  function renderEvents(highlightKey) {
    var list = EVENTS.filter(function (e) { return currentFilter === "tous" || e.cat === currentFilter; });
    eventsEl.innerHTML = "";
    if (!list.length) { eventsEl.innerHTML = '<p class="events-empty">Aucun événement dans cette catégorie pour le moment.</p>'; return; }
    list.forEach(function (e) {
      var art = document.createElement("article");
      art.className = "event reveal in" + (e.key === highlightKey ? " hl" : "");
      art.id = "ev-" + e.key;
      art.innerHTML =
        '<div class="ev-date"><p class="ev-d">' + e.date.getDate() + '</p><p class="ev-m">' + fmtMonthShort.format(e.date).replace(".", "") + "</p></div>" +
        '<div><p class="ev-cat">' + e.label + " · " + cap(fmtWeekday.format(e.date)) + '</p><h3 class="ev-title"></h3><p class="ev-place"></p></div>';
      art.querySelector(".ev-title").textContent = e.title;
      art.querySelector(".ev-place").textContent = e.place;
      eventsEl.appendChild(art);
    });
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  document.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      currentFilter = chip.dataset.filter;
      document.querySelectorAll(".chip").forEach(function (c) {
        var on = c === chip; c.classList.toggle("on", on); c.setAttribute("aria-selected", String(on));
      });
      renderEvents();
    });
  });
  renderEvents();

  /* ---------- Calendrier ---------- */
  var calGrid = document.getElementById("cal-grid");
  var calMonth = document.getElementById("cal-month");
  var view = new Date(today.getFullYear(), today.getMonth(), 1);
  var fmtMonth = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
  var pop = document.createElement("p"); pop.className = "cal-pop"; pop.setAttribute("aria-live", "polite");
  calGrid.parentNode.insertBefore(pop, calGrid.nextSibling);

  function renderCal() {
    calMonth.textContent = fmtMonth.format(view);
    calGrid.innerHTML = "";
    ["L", "M", "M", "J", "V", "S", "D"].forEach(function (l) {
      var h = document.createElement("span"); h.className = "cal-dow"; h.textContent = l; h.setAttribute("aria-hidden", "true"); calGrid.appendChild(h);
    });
    var offset = (view.getDay() + 6) % 7; // lundi en premier
    var start = new Date(view); start.setDate(1 - offset);
    var byKey = {};
    EVENTS.forEach(function (e) { (byKey[e.key] = byKey[e.key] || []).push(e); });
    for (var i = 0; i < 42; i++) {
      var day = new Date(start); day.setDate(start.getDate() + i);
      if (i >= 35 && day.getMonth() !== view.getMonth()) break;
      var k = keyOf(day), evs = byKey[k];
      var b = document.createElement(evs ? "button" : "span");
      b.className = "cal-day" + (day.getMonth() !== view.getMonth() ? " out" : "") + (k === keyOf(today) ? " today" : "") + (evs ? " ev" : "");
      b.textContent = day.getDate();
      if (evs) {
        b.type = "button";
        b.setAttribute("aria-label", fmtWeekday.format(day) + " : " + evs.map(function (e) { return e.title; }).join(", "));
        b.addEventListener("click", (function (list, key) {
          return function () {
            pop.innerHTML = "";
            var s = document.createElement("strong"); s.textContent = list[0].title; pop.appendChild(s);
            pop.appendChild(document.createTextNode(" · " + list[0].place + " "));
            var a = document.createElement("a"); a.href = "#agenda"; a.className = "mention"; a.textContent = "Voir";
            a.addEventListener("click", function () {
              currentFilter = "tous";
              document.querySelectorAll(".chip").forEach(function (c) { var on = c.dataset.filter === "tous"; c.classList.toggle("on", on); c.setAttribute("aria-selected", String(on)); });
              renderEvents(key);
            });
            pop.appendChild(a);
          };
        })(evs, k));
      }
      calGrid.appendChild(b);
    }
  }
  document.getElementById("cal-prev").addEventListener("click", function () { view.setMonth(view.getMonth() - 1); pop.textContent = ""; renderCal(); });
  document.getElementById("cal-next").addEventListener("click", function () { view.setMonth(view.getMonth() + 1); pop.textContent = ""; renderCal(); });
  renderCal();

  /* ---------- Lettre d'information ---------- */
  var form = document.getElementById("newsletter");
  var msg = document.getElementById("form-msg");
  var email = document.getElementById("email");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      email.setAttribute("aria-invalid", "true");
      msg.textContent = "Merci d'indiquer une adresse e-mail valide.";
      email.focus();
      return;
    }
    email.removeAttribute("aria-invalid");
    msg.textContent = "Merci ! Votre inscription est bien prise en compte.";
    form.reset();
  });

  /* ---------- Apparition au défilement ---------- */
  var reveals = document.querySelectorAll(".section-head, .feature, .block, .stat, .timeline li, .card, .contact > *");
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { el.classList.add("reveal"); io.observe(el); });
  }
})();
