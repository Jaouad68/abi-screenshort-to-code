/* ============================================================
   MAROC — Royaume d'Or & de Lumière | Main JS v2
   ============================================================ */

// ─── Loader ───────────────────────────────────────────────
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loader').classList.add('hidden');
    startHeroSlider();
    initCounters();
    startTypewriter();
  }, 1800);
});

// ─── Dark Mode ────────────────────────────────────────────
const darkToggle = document.getElementById('darkToggle');
const html = document.documentElement;

function setTheme(theme) {
  html.setAttribute('data-theme', theme);
  localStorage.setItem('maroc-theme', theme);
  const icon = darkToggle.querySelector('i');
  if (icon) {
    icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
}

// Init theme from localStorage
(function() {
  const saved = localStorage.getItem('maroc-theme') || 'light';
  setTheme(saved);
})();

darkToggle.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
});

// ─── Progress Bar ─────────────────────────────────────────
const progressBar = document.getElementById('progressBar');
window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  if (progressBar) progressBar.style.width = pct + '%';
}, { passive: true });

// ─── Reading time badge ───────────────────────────────────
let readingStartTime = null;
const readingBadge = document.getElementById('readingBadge');
const readingTimeEl = document.getElementById('readingTime');

window.addEventListener('scroll', () => {
  if (window.scrollY > 300) {
    if (!readingStartTime) readingStartTime = Date.now();
    if (readingBadge) readingBadge.classList.add('visible');
  }
}, { passive: true });

setInterval(() => {
  if (readingStartTime && readingTimeEl) {
    const mins = Math.floor((Date.now() - readingStartTime) / 60000);
    readingTimeEl.textContent = mins < 1 ? '< 1 min' : mins + ' min';
  }
}, 10000);

// ─── Navbar scroll effect ──────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
  document.getElementById('backToTop').classList.toggle('visible', window.scrollY > 400);
}, { passive: true });

// ─── Mobile menu ──────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const mobileClose = document.getElementById('mobileClose');

hamburger.addEventListener('click', () => mobileMenu.classList.add('open'));
mobileClose.addEventListener('click', () => mobileMenu.classList.remove('open'));

document.querySelectorAll('.mobile-link').forEach(link => {
  link.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

// ─── Smooth scroll helper ─────────────────────────────────
function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

// ─── Hero Slider ──────────────────────────────────────────
let heroIndex = 0;
let heroTimer;
const HERO_COUNT = 6;

function startHeroSlider() {
  goToSlide(0);
  heroTimer = setInterval(() => {
    heroIndex = (heroIndex + 1) % HERO_COUNT;
    goToSlide(heroIndex);
  }, 6000);
}

function goToSlide(i) {
  document.querySelectorAll('.hero-slide').forEach((s, idx) => {
    s.classList.toggle('active', idx === i);
  });
  document.querySelectorAll('#heroDots .dot').forEach((d, idx) => {
    d.classList.toggle('active', idx === i);
  });
  heroIndex = i;
}

document.querySelectorAll('#heroDots .dot').forEach(dot => {
  dot.addEventListener('click', () => {
    clearInterval(heroTimer);
    goToSlide(parseInt(dot.dataset.index));
    heroTimer = setInterval(() => {
      heroIndex = (heroIndex + 1) % HERO_COUNT;
      goToSlide(heroIndex);
    }, 6000);
  });
});

// ─── Typewriter on hero subtitle ─────────────────────────
const typewriterEl = document.getElementById('heroTypewriter');
const typewriterTexts = [
  "Là où l'Atlas touche le ciel, où le Sahara rencontre l'océan...",
  "Des souks de Fès aux dunes de Merzouga — l'aventure vous attend.",
  "Premier pays africain en demi-finale de Coupe du Monde.",
  "Trois mers, un désert, des montagnes et mille saveurs.",
];
let twIndex = 0;
let twCharIndex = 0;
let twIsDeleting = false;
let twTimer;

function startTypewriter() {
  if (!typewriterEl) return;
  typewriteTick();
}

function typewriteTick() {
  const current = typewriterTexts[twIndex];
  if (twIsDeleting) {
    twCharIndex--;
    typewriterEl.textContent = current.substring(0, twCharIndex);
    if (twCharIndex === 0) {
      twIsDeleting = false;
      twIndex = (twIndex + 1) % typewriterTexts.length;
      twTimer = setTimeout(typewriteTick, 500);
      return;
    }
    twTimer = setTimeout(typewriteTick, 40);
  } else {
    twCharIndex++;
    typewriterEl.textContent = current.substring(0, twCharIndex);
    if (twCharIndex === current.length) {
      twIsDeleting = true;
      twTimer = setTimeout(typewriteTick, 2800);
      return;
    }
    twTimer = setTimeout(typewriteTick, 65);
  }
}

// ─── Stats counters ────────────────────────────────────────
function initCounters() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.stat-num').forEach(el => observer.observe(el));
}

function animateCounter(el) {
  const target = parseInt(el.dataset.target);
  const duration = 2000;
  const step = target / (duration / 16);
  let current = 0;
  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    el.textContent = Math.floor(current).toLocaleString('fr-FR');
  }, 16);
}

// ─── Destination Filter ────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    document.querySelectorAll('.dest-card').forEach(card => {
      const show = filter === 'all' || card.dataset.cat === filter;
      card.style.display = show ? '' : 'none';
      if (show) card.style.animation = 'fadeIn 0.4s ease';
    });
  });
});

// ─── Culture Tabs ──────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const target = document.getElementById('tab-' + btn.dataset.tab);
    if (target) target.classList.add('active');
  });
});

// ─── Cuisine Carousel ─────────────────────────────────────
let cuisinePos = 0;
let cuisineCardCount;
let cardsVisible;

function initCarousel() {
  const track = document.getElementById('cuisineTrack');
  if (!track) return;
  const cards = track.querySelectorAll('.cuisine-card');
  cuisineCardCount = cards.length;
  cardsVisible = window.innerWidth > 1024 ? 3 : window.innerWidth > 600 ? 2 : 1;

  const dotsContainer = document.getElementById('cuisineDots');
  dotsContainer.innerHTML = '';
  const totalDots = Math.max(1, cuisineCardCount - cardsVisible + 1);
  for (let i = 0; i < totalDots; i++) {
    const dot = document.createElement('button');
    dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => goToCarousel(i));
    dotsContainer.appendChild(dot);
  }
  goToCarousel(0);
}

function goToCarousel(index) {
  const track = document.getElementById('cuisineTrack');
  if (!track) return;
  const cardEl = track.querySelector('.cuisine-card');
  if (!cardEl) return;
  const cardWidth = cardEl.offsetWidth + 24;
  const maxPos = Math.max(0, cuisineCardCount - cardsVisible);
  cuisinePos = Math.max(0, Math.min(index, maxPos));
  track.style.transform = 'translateX(' + (-cuisinePos * cardWidth) + 'px)';
  document.querySelectorAll('.carousel-dot').forEach((d, i) => {
    d.classList.toggle('active', i === cuisinePos);
  });
}

const cuisineNextBtn = document.getElementById('cuisineNext');
const cuisinePrevBtn = document.getElementById('cuisinePrev');
if (cuisineNextBtn) cuisineNextBtn.addEventListener('click', () => goToCarousel(cuisinePos + 1));
if (cuisinePrevBtn) cuisinePrevBtn.addEventListener('click', () => goToCarousel(cuisinePos - 1));

window.addEventListener('resize', initCarousel);
initCarousel();

// Touch swipe for carousel
let touchStartX = 0;
const cuisineCarousel = document.getElementById('cuisineCarousel');
if (cuisineCarousel) {
  cuisineCarousel.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  cuisineCarousel.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) goToCarousel(cuisinePos + (dx < 0 ? 1 : -1));
  }, { passive: true });
}

// ─── Gallery Lightbox ─────────────────────────────────────
const galleryImages = [
  { src: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1200&q=90', caption: 'Jemaa el-Fna, Marrakech' },
  { src: 'https://images.unsplash.com/photo-1539020140153-e479b8c8e9bc?w=1200&q=90', caption: 'Médina de Fès' },
  { src: 'https://images.unsplash.com/photo-1548019979-a6e9a8c3d4c7?w=1200&q=90', caption: 'Chefchaouen la Bleue' },
  { src: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=1200&q=90', caption: 'Erg Chebbi, Sahara' },
  { src: 'https://images.unsplash.com/photo-1529963183134-61a90db47eaf?w=1200&q=90', caption: 'Artisanat de Marrakech' },
  { src: 'https://images.unsplash.com/photo-1565771768700-ec8e24f4a4e3?w=1200&q=90', caption: 'Haut Atlas' },
  { src: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=1200&q=90', caption: 'Zellige — Art Marocain' },
  { src: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&q=90', caption: 'Mosquée Hassan II, Casablanca' },
  { src: 'https://images.unsplash.com/photo-1577791465485-b8d90f4d3609?w=1200&q=90', caption: "Port d'Essaouira" },
  { src: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=1200&q=90', caption: 'Tanneries de Fès' },
];

let lightboxIndex = 0;

function openLightbox(index) {
  lightboxIndex = index;
  updateLightbox();
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}

function changeLightbox(dir) {
  lightboxIndex = (lightboxIndex + dir + galleryImages.length) % galleryImages.length;
  updateLightbox();
}

function updateLightbox() {
  const img = galleryImages[lightboxIndex];
  document.getElementById('lightboxImg').src = img.src;
  document.getElementById('lightboxImg').alt = img.caption;
  document.getElementById('lightboxCaption').textContent = img.caption;
}

document.addEventListener('keydown', e => {
  if (document.getElementById('lightbox').classList.contains('open')) {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') changeLightbox(1);
    if (e.key === 'ArrowLeft') changeLightbox(-1);
  }
  if (e.key === 'Escape') closeDestModal();
});

// ─── Destination Modal ─────────────────────────────────────
const destData = {
  marrakech: {
    img: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&q=90',
    name: 'Marrakech', subtitle: 'La Ville Rouge', rating: '★★★★★ 4.9/5',
    desc: "Surnommée la \"Ville Rose\" ou \"Ville Rouge\" pour la couleur ocre de ses bâtiments, Marrakech est la destination la plus visitée du Maroc. Fondée en 1070 par les Almoravides, elle abrite l'une des médinas les plus vivantes au monde.\n\nLa place Jemaa el-Fna est le cœur battant de la ville : jongleurs, conteurs, charmeurs de serpents et musiciens gnawa se côtoient au coucher du soleil.",
    mustSee: ['Jemaa el-Fna & les souks','Palais Bahia & Palais Badi','Jardin Majorelle & Musée YSL','La Koutoubia','Tombeaux Saadiens','Medina UNESCO'],
    tip: '💡 <strong>Conseil :</strong> Logez dans un riad de la médina pour une expérience authentique.',
  },
  fes: {
    img: 'https://images.unsplash.com/photo-1539020140153-e479b8c8e9bc?w=800&q=90',
    name: 'Fès', subtitle: 'La Capitale Spirituelle', rating: '★★★★★ 4.8/5',
    desc: "Fès est la plus ancienne des villes impériales du Maroc. Fondée en 789 par Idris Ier, elle abrite l'université Al-Qarawiyyin — la plus ancienne université en activité au monde (859 apr. J.-C.).\n\nLa médina de Fès el-Bali est un labyrinthe de 9 400 ruelles classé au Patrimoine Mondial de l'UNESCO depuis 1981.",
    mustSee: ['Tanneries Chouara','Université Al-Qarawiyyin (fondée en 859)','Medersa Bou Inania','Souk el-Attarine','Fondouk el-Najjarine'],
    tip: '💡 <strong>Conseil :</strong> Engagez un guide officiel — la médina est si dense qu\'il est facile de se perdre !',
  },
  chefchaouen: {
    img: 'https://images.unsplash.com/photo-1548019979-a6e9a8c3d4c7?w=800&q=90',
    name: 'Chefchaouen', subtitle: 'La Perle Bleue du Rif', rating: '★★★★★ 4.9/5',
    desc: "Nichée dans les montagnes du Rif, Chefchaouen est la ville bleue par excellence. Ses maisons et ruelles peintes de toutes les nuances de bleu en font l'une des villes les plus photographiées d'Afrique.\n\nFondée en 1471, la ville abrite une médina authentique où l'atmosphère est plus calme et posée qu'à Marrakech ou Fès.",
    mustSee: ['La médina bleue','Place Uta el-Hammam','Kasbah et musée','Randonnée à Jebel El Kelaa','Cascade d\'Akchour'],
    tip: '💡 <strong>Conseil :</strong> Venez tôt le matin pour photographier les ruelles sans foule.',
  },
  sahara: {
    img: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=800&q=90',
    name: 'Merzouga & Sahara', subtitle: 'Le Grand Désert', rating: '★★★★★ 5.0/5',
    desc: "L'Erg Chebbi, près de Merzouga, est la porte du Sahara marocain — un océan de dunes dorées pouvant atteindre 150 mètres de hauteur.\n\nL'expérience de la nuit sous les étoiles dans le désert, après une traversée en dromadaire au coucher du soleil, est universellement décrite comme un moment de vie inoubliable.",
    mustSee: ['Lever et coucher de soleil sur les dunes','Randonnée en dromadaire','Nuit en camp de luxe','Étoiles du Sahara','Village de Khamlia — musique Gnawa'],
    tip: '💡 <strong>Conseil :</strong> Prévoyez au minimum une nuit sur place. Emportez un keffieh pour vous protéger du sable.',
  },
  casablanca: {
    img: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=90',
    name: 'Casablanca', subtitle: 'La Métropole du Maroc', rating: '★★★★ 4.6/5',
    desc: "Casablanca est la plus grande ville du Maroc et son poumon économique. Ville moderne et cosmopolite, elle est célèbre pour la grandiose Mosquée Hassan II, construite sur l'océan Atlantique.\n\n\"Casa\" abrite une architecture Art Déco unique au monde, une scène gastronomique effervescente et Casablanca Finance City, hub africain.",
    mustSee: ['Mosquée Hassan II','Quartier Art Déco','Corniche Ain Diab','Quartier des Habous','Musée Slaoui'],
    tip: '💡 <strong>Conseil :</strong> La Mosquée Hassan II est l\'une des rares mosquées d\'Afrique ouverte aux non-musulmans.',
  },
  atlas: {
    img: 'https://images.unsplash.com/photo-1565771768700-ec8e24f4a4e3?w=800&q=90',
    name: 'Haut Atlas', subtitle: 'Le Toit de l\'Afrique du Nord', rating: '★★★★★ 4.8/5',
    desc: "Le Haut Atlas est la chaîne de montagnes la plus imposante d'Afrique, s'étirant sur 700 km. Le Jbel Toubkal (4 167 m) est le plus haut sommet d'Afrique du Nord et peut être gravi sans équipement technique en 2 jours.\n\nLa région est habitée par les Berbères amazighs qui y vivent selon des traditions séculaires.",
    mustSee: ['Ascension du Toubkal (4167m)','Vallée de l\'Ourika','Village d\'Imlil','Vallée des Roses','Station de ski Oukaimeden'],
    tip: '💡 <strong>Conseil :</strong> Pour le Toubkal, partez d\'Imlil avec un guide agréé. Meilleure période : juin-septembre.',
  },
  essaouira: {
    img: 'https://images.unsplash.com/photo-1577791465485-b8d90f4d3609?w=800&q=90',
    name: 'Essaouira', subtitle: 'La Cité des Alizés', rating: '★★★★ 4.7/5',
    desc: "Ancienne cité portugaise et corsaire, Essaouira est une ville côtière unique au caractère bohème et artistique. Ses remparts ocre face à l'Atlantique classés UNESCO, ses ruelles blanches et bleues en font une destination irrésistible.\n\nSurnommée \"La Cité des Alizés\", elle est un haut lieu du kitesurf et du windsurf.",
    mustSee: ['Remparts et bastions','Port de pêche coloré','Festival Gnaoua (juin)','Plage & kitesurf','Médina UNESCO'],
    tip: '💡 <strong>Conseil :</strong> Le vent est quasi permanent — prévoyez un coupe-vent. Les sardines au port sont excellentes.',
  },
  rabat: {
    img: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&q=90',
    name: 'Rabat', subtitle: 'La Capitale Royale', rating: '★★★★ 4.7/5',
    desc: "Rabat, capitale administrative et politique du Maroc, est une ville royale élégante et moderne. Son ensemble historique — médina, Kasbah des Oudayas, Tour Hassan et Chellah — est classé UNESCO depuis 2012.\n\nContrairement à Marrakech, Rabat est souvent méconnue des touristes, ce qui en fait une perle authentique.",
    mustSee: ['Kasbah des Oudayas','Tour Hassan & Mausolée Mohammed V','Chellah — ruines romaines','Médina de Rabat','Plage'],
    tip: '💡 <strong>Conseil :</strong> Rabat est à 45 min de Casablanca en train et peut se visiter en journée.',
  },
  aitbenhaddou: {
    img: 'https://images.unsplash.com/photo-1562166963-bce7c7a8c4f5?w=800&q=90',
    name: 'Aït Benhaddou', subtitle: 'Le Ksar Légendaire', rating: '★★★★★ 4.9/5',
    desc: "Aït Benhaddou est un ksar en pisé d'une beauté architecturale saisissante, classé UNESCO depuis 1987. Il a servi de décor à plus de 20 films et séries : Gladiator, Lawrence d'Arabie, Game of Thrones, Babel…\n\nLa lumière de fin de journée sur les tours de pisé dorées est un spectacle absolument unique.",
    mustSee: ['Visite du ksar','Vue panoramique depuis la tour','Route des Kasbahs','Ouarzazate — studios Atlas','Vallée du Draa'],
    tip: '💡 <strong>Conseil :</strong> Venez au coucher du soleil — les tours de pisé prennent une teinte dorée-orange magique.',
  },
  tanger: {
    img: 'https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?w=800&q=90',
    name: 'Tanger', subtitle: 'La Porte de l\'Afrique', rating: '★★★★ 4.6/5',
    desc: "Tanger est la porte du Maroc vers l'Europe — à seulement 14 km de l'Espagne. Carrefour millénaire entre l'Atlantique et la Méditerranée, l'Afrique et l'Europe, elle a inspiré Matisse, Delacroix et des générations d'écrivains.\n\nAvec l'ouverture du port Tanger Med (le plus grand d'Afrique) et le TGV Al Boraq, Tanger est en pleine renaissance économique.",
    mustSee: ['Médina de Tanger','Cap Spartel & Grottes d\'Hercule','Villa Perdicaris','Détroit de Gibraltar','Tanger Med'],
    tip: '💡 <strong>Conseil :</strong> La vue sur le Détroit de Gibraltar depuis le Cap Spartel est un must absolu.',
  },
  agadir: {
    img: 'https://images.unsplash.com/photo-1547451832-5e28f0f4f7b0?w=800&q=90',
    name: 'Agadir', subtitle: 'Station Balnéaire', rating: '★★★★ 4.5/5',
    desc: "Agadir est la grande station balnéaire du Maroc avec sa plage de 10 km de sable fin et son ensoleillement exceptionnel (330 jours de soleil/an). Reconstruite après le tremblement de terre de 1960, la ville est moderne et bien aménagée.\n\nProche du parc Souss-Massa et des arganiers, Agadir est idéale pour les familles et les amateurs de surf.",
    mustSee: ['Plage d\'Agadir','Kasbah d\'Agadir (panorama)','Souk El Had','Vallée du Paradis','Taghazout — surf'],
    tip: '💡 <strong>Conseil :</strong> Logez dans le quartier Talborjt pour plus d\'authenticité. Surf idéal à Taghazout (20 min).',
  },
  meknes: {
    img: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800&q=90',
    name: 'Meknès', subtitle: 'La Ville Ismaïlienne', rating: '★★★★ 4.7/5',
    desc: "Meknès, quatrième ville impériale, est souvent surnommée 'la Versailles du Maroc'. Moulay Ismaïl y fit construire une immense cité palatiale avec des remparts de 40 km et des écuries pouvant loger 12 000 chevaux.\n\nSa médina et ses monuments mérinides sont classés UNESCO depuis 1996.",
    mustSee: ['Bab Mansour — porte monumentale','Mausolée de Moulay Ismaïl','Heri es-Souani (greniers royaux)','Médina UNESCO','Volubilis (30 min) — cité romaine'],
    tip: '💡 <strong>Conseil :</strong> Combinez Meknès avec Volubilis et Moulay Idriss Zerhoun pour une journée royale.',
  },
  dades: {
    img: 'https://images.unsplash.com/photo-1551009175-8a68da93d5f9?w=800&q=90',
    name: 'Vallée du Dadès', subtitle: 'La Vallée des Mille Kasbahs', rating: '★★★★★ 4.8/5',
    desc: "La vallée du Dadès, entre les montagnes du Haut Atlas et le désert, est l'une des plus spectaculaires du Maroc. Ses gorges vertigineuses, ses kasbahs en pisé rouge et ses champs de roses en font un lieu d'exception.\n\nEn avril, la Vallée des Roses à Kelaat M'Gouna s'illumine de milliers de roses de damas récoltées pour la production de l'huile de rose.",
    mustSee: ['Gorges du Dadès','Gorges du Todra (près)','Festival des Roses (avril)','Kasbahs de Skoura','Route des Kasbahs (N10)'],
    tip: '💡 <strong>Conseil :</strong> Louez une voiture — les routes des gorges sont magnifiques mais sinueuses. Le matin est idéal pour les photos.',
  },
  ouarzazate: {
    img: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&q=90',
    name: 'Ouarzazate', subtitle: 'Hollywood d\'Afrique', rating: '★★★★ 4.7/5',
    desc: "Ouarzazate est la porte du désert et le Hollywood africain. Ses studios de cinéma Atlas (les plus grands d'Afrique) ont accueilli Lawrence d'Arabie, Gladiator, Game of Thrones et des centaines d'autres productions.\n\nLa centrale solaire Noor, la plus grande au monde, est visible depuis la ville.",
    mustSee: ['Studios Atlas (visite guidée)','Kasbah Taourirt','Aït Benhaddou (30 min)','Centrale Noor (vue extérieure)','Vallée du Draa'],
    tip: '💡 <strong>Conseil :</strong> La visite des studios est une expérience unique. Réservez tôt si vous venez en juillet-août.',
  },
};

function openDestModal(id) {
  const data = destData[id];
  if (!data) return;
  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = `
    <img class="modal-dest-img" src="${data.img}" alt="${data.name}" />
    <div class="modal-dest-body">
      <div class="dest-rating-big">${data.rating} — ${data.subtitle}</div>
      <h2>${data.name}</h2>
      ${data.desc.split('\n\n').map(p => '<p>' + p + '</p>').join('')}
      <div class="modal-must-see">
        <h4>À ne pas manquer :</h4>
        <ul>${data.mustSee.map(item => '<li>' + item + '</li>').join('')}</ul>
      </div>
      <div class="modal-tips">${data.tip}</div>
    </div>
  `;
  document.getElementById('destModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDestModal() {
  document.getElementById('destModal').classList.remove('open');
  document.body.style.overflow = '';
}

// ─── Contact Form ──────────────────────────────────────────
function handleSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');
  form.style.display = 'none';
  success.classList.add('visible');
}

// ─── AOS (Animate On Scroll) ──────────────────────────────
function initAOS() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.aosDelay;
        if (delay) {
          setTimeout(() => entry.target.classList.add('aos-animate'), parseInt(delay));
        } else {
          entry.target.classList.add('aos-animate');
        }
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('[data-aos]').forEach(el => observer.observe(el));
}
initAOS();

// ─── Parallax effect on hero ──────────────────────────────
window.addEventListener('scroll', () => {
  const scrolled = window.scrollY;
  const heroContent = document.querySelector('.hero-content');
  if (heroContent && scrolled < window.innerHeight) {
    heroContent.style.transform = 'translateY(' + (scrolled * 0.3) + 'px)';
    heroContent.style.opacity = String(1 - scrolled / (window.innerHeight * 0.7));
  }
}, { passive: true });

// ─── Active nav link highlighting ─────────────────────────
const sections = document.querySelectorAll('section[id]');
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    if (window.scrollY >= section.offsetTop - 100) current = section.id;
  });
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.style.color = a.getAttribute('href') === '#' + current ? 'var(--gold)' : '';
  });
}, { passive: true });

// ─── Quiz ─────────────────────────────────────────────────
const quizQuestions = [
  {
    q: "Quelle est la capitale du Maroc ?",
    options: ["Casablanca", "Marrakech", "Rabat", "Fès"],
    correct: 2,
    explanation: "Rabat est la capitale politique et administrative du Maroc depuis 1956, bien que Casablanca soit la plus grande ville économique."
  },
  {
    q: "Quel est le point culminant du Maroc et d'Afrique du Nord ?",
    options: ["Jbel Ayachi", "Jbel Toubkal", "Jbel Mgoun", "Jbel Bou Naceur"],
    correct: 1,
    explanation: "Le Jbel Toubkal culmine à 4 167 mètres. C'est le plus haut sommet du Maroc et d'Afrique du Nord, accessible depuis Imlil en 2 jours."
  },
  {
    q: "Quelle est la plus ancienne université encore en activité au monde, fondée à Fès en 859 ?",
    options: ["Université de Bologne", "Al-Qarawiyyin", "Université d'Oxford", "Université de Salamanque"],
    correct: 1,
    explanation: "L'Université Al-Qarawiyyin de Fès, fondée en 859 par Fatima al-Fihri, est reconnue par le Livre Guinness des records comme la plus ancienne université en activité du monde."
  },
  {
    q: "Le Maroc possède quelle part des réserves mondiales de phosphates ?",
    options: ["30%", "50%", "70%", "90%"],
    correct: 2,
    explanation: "Le Maroc détient environ 70% des réserves mondiales de phosphates, faisant de l'OCP Group (Office Chérifien des Phosphates) l'un des leaders mondiaux des engrais."
  },
  {
    q: "Quelle ville marocaine est surnommée 'La Perle Bleue' ?",
    options: ["Essaouira", "Chefchaouen", "Asilah", "Al Hoceïma"],
    correct: 1,
    explanation: "Chefchaouen, nichée dans le Rif, est célèbre pour ses rues et maisons peintes en différentes nuances de bleu. Fondée en 1471, elle est l'une des villes les plus photographiées d'Afrique."
  },
  {
    q: "Lors de la Coupe du Monde 2022 au Qatar, jusqu'où les Lions de l'Atlas ont-ils atteint ?",
    options: ["Quarts de finale", "Huitièmes de finale", "Demi-finales", "Finale"],
    correct: 2,
    explanation: "Le Maroc a atteint les demi-finales de la Coupe du Monde 2022, devenant la première nation africaine et arabe à accomplir cet exploit historique. Ils ont terminé 4ème."
  },
  {
    q: "L'huile d'argan provient d'un arbre endémique au Maroc. Comment s'appelle-t-il ?",
    options: ["Argania spinosa", "Olea europaea", "Phoenix dactylifera", "Cedrus atlantica"],
    correct: 0,
    explanation: "L'Argania spinosa, ou arganier, pousse quasi exclusivement dans le Souss marocain. Son huile précieuse, produite par des coopératives féminines, est classée patrimoine UNESCO depuis 2014."
  },
  {
    q: "Quel style de musique mystique marocain utilise le guembri et les qraqeb, classé patrimoine UNESCO ?",
    options: ["Chaabi", "Rai", "Gnawa", "Malhoun"],
    correct: 2,
    explanation: "La musique Gnawa, descendante des esclaves sub-sahariens, est une pratique spirituelle et musicale utilisant le guembri (basse à 3 cordes) et les qraqeb (castagnettes en métal). Elle est inscrite au patrimoine immatériel UNESCO depuis 2019."
  }
];

let quizCurrent = 0;
let quizScore = 0;
let quizAnswered = false;

function initQuiz() {
  quizCurrent = 0;
  quizScore = 0;
  quizAnswered = false;
  renderQuestion();
  document.getElementById('quizResult').style.display = 'none';
  document.getElementById('quizQuestionWrap').style.display = 'block';
}

function renderQuestion() {
  const wrap = document.getElementById('quizQuestionWrap');
  if (!wrap) return;
  const q = quizQuestions[quizCurrent];
  const pct = ((quizCurrent) / quizQuestions.length) * 100;
  document.getElementById('quizProgressFill').style.width = pct + '%';
  document.getElementById('quizProgressText').textContent = 'Question ' + (quizCurrent + 1) + ' / ' + quizQuestions.length;

  wrap.innerHTML = `
    <div class="quiz-question">
      <div class="quiz-q-num">Question ${quizCurrent + 1}</div>
      <div class="quiz-q-text">${q.q}</div>
      <div class="quiz-options">
        ${q.options.map((opt, i) => `
          <button class="quiz-option" onclick="selectAnswer(${i})" id="opt-${i}">${opt}</button>
        `).join('')}
      </div>
      <div id="quizFeedback"></div>
    </div>
  `;
  quizAnswered = false;
}

function selectAnswer(index) {
  if (quizAnswered) return;
  quizAnswered = true;
  const q = quizQuestions[quizCurrent];
  const isCorrect = index === q.correct;
  if (isCorrect) quizScore++;

  document.querySelectorAll('.quiz-option').forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correct) btn.classList.add('correct');
    else if (i === index && !isCorrect) btn.classList.add('incorrect');
  });

  const feedback = document.getElementById('quizFeedback');
  if (feedback) {
    feedback.className = 'quiz-feedback ' + (isCorrect ? 'correct' : 'incorrect');
    feedback.innerHTML = (isCorrect ? '✓ Bravo ! ' : '✗ Incorrect. ') + q.explanation;
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = 'quiz-next-btn';
  nextBtn.textContent = quizCurrent < quizQuestions.length - 1 ? 'Question suivante →' : 'Voir les résultats →';
  nextBtn.onclick = nextQuestion;
  const wrap = document.getElementById('quizQuestionWrap');
  if (wrap) wrap.querySelector('.quiz-question').appendChild(nextBtn);
}

function nextQuestion() {
  quizCurrent++;
  if (quizCurrent >= quizQuestions.length) {
    showResults();
  } else {
    renderQuestion();
  }
}

function showResults() {
  document.getElementById('quizProgressFill').style.width = '100%';
  document.getElementById('quizProgressText').textContent = 'Terminé !';
  document.getElementById('quizQuestionWrap').style.display = 'none';
  const result = document.getElementById('quizResult');
  result.style.display = 'block';

  const pct = Math.round((quizScore / quizQuestions.length) * 100);
  let icon, title, desc;
  if (pct >= 87) { icon = '🏆'; title = 'Expert du Maroc !'; desc = 'Impressionnant ! Vous connaissez le Royaume Chérifien sur le bout des doigts. Vous êtes prêt à être guide touristique !'; }
  else if (pct >= 62) { icon = '⭐'; title = 'Bon connaisseur !'; desc = 'Félicitations ! Vous avez une belle connaissance du Maroc. Quelques lectures supplémentaires et vous serez un expert !'; }
  else if (pct >= 37) { icon = '📚'; title = 'Curieux du Maroc'; desc = 'Pas mal ! Il vous reste encore beaucoup à découvrir sur ce royaume fascinant. Explorez le reste du site !'; }
  else { icon = '🌍'; title = 'Débutant en herbe'; desc = 'Le Maroc vous réserve encore beaucoup de surprises ! Parcourez ce guide et retentez votre chance.'; }

  document.getElementById('quizResultIcon').textContent = icon;
  document.getElementById('quizResultTitle').textContent = title;
  document.getElementById('quizResultDesc').textContent = desc;
  document.getElementById('quizScoreDisplay').textContent = quizScore + ' / ' + quizQuestions.length;
}

function restartQuiz() {
  initQuiz();
}

// Init quiz on page load
initQuiz();
