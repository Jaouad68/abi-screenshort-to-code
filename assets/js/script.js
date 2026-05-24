/* ============================================================
   MAROC — Royaume d'Or & de Lumière | Main JS
   ============================================================ */

// ─── Loader ───────────────────────────────────────────────
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loader').classList.add('hidden');
    startHeroSlider();
    initCounters();
  }, 1800);
});

// ─── Navbar scroll effect ──────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
  document.getElementById('backToTop').classList.toggle('visible', window.scrollY > 400);
});

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

function startHeroSlider() {
  goToSlide(0);
  heroTimer = setInterval(() => {
    heroIndex = (heroIndex + 1) % 4;
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
      heroIndex = (heroIndex + 1) % 4;
      goToSlide(heroIndex);
    }, 6000);
  });
});

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
      if (show) {
        card.style.animation = 'fadeIn 0.4s ease';
      }
    });
  });
});

// ─── Culture Tabs ──────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// ─── Cuisine Carousel ─────────────────────────────────────
let cuisinePos = 0;
let cuisineCardCount;
let cardsVisible;

function initCarousel() {
  const track = document.getElementById('cuisineTrack');
  const cards = track.querySelectorAll('.cuisine-card');
  cuisineCardCount = cards.length;

  cardsVisible = window.innerWidth > 1024 ? 3 : window.innerWidth > 600 ? 2 : 1;

  const dotsContainer = document.getElementById('cuisineDots');
  dotsContainer.innerHTML = '';
  const totalDots = cuisineCardCount - cardsVisible + 1;
  for (let i = 0; i < totalDots; i++) {
    const dot = document.createElement('button');
    dot.className = `carousel-dot${i === 0 ? ' active' : ''}`;
    dot.addEventListener('click', () => goToCarousel(i));
    dotsContainer.appendChild(dot);
  }
  goToCarousel(0);
}

function goToCarousel(index) {
  const track = document.getElementById('cuisineTrack');
  const cardWidth = track.querySelector('.cuisine-card').offsetWidth + 24;
  const maxPos = cuisineCardCount - cardsVisible;
  cuisinePos = Math.max(0, Math.min(index, maxPos));
  track.style.transform = `translateX(${-cuisinePos * cardWidth}px)`;
  document.querySelectorAll('.carousel-dot').forEach((d, i) => {
    d.classList.toggle('active', i === cuisinePos);
  });
}

document.getElementById('cuisineNext').addEventListener('click', () => {
  goToCarousel(cuisinePos + 1);
});
document.getElementById('cuisinePrev').addEventListener('click', () => {
  goToCarousel(cuisinePos - 1);
});

window.addEventListener('resize', initCarousel);
initCarousel();

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
  if (!document.getElementById('lightbox').classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowRight') changeLightbox(1);
  if (e.key === 'ArrowLeft') changeLightbox(-1);
});

// ─── Destination Modal ─────────────────────────────────────
const destData = {
  marrakech: {
    img: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&q=90',
    name: 'Marrakech',
    subtitle: 'La Ville Rouge',
    rating: '★★★★★ 4.9/5',
    desc: `Surnommée la "Ville Rose" ou "Ville Rouge" pour la couleur ocre de ses bâtiments, Marrakech est la destination la plus visitée du Maroc. Fondée en 1070 par les Almoravides, elle abrite l'une des médinas les plus vivantes au monde, classée UNESCO en 1985.

La place Jemaa el-Fna est le cœur battant de la ville : jongleurs, conteurs, charmeurs de serpents et musiciens gnawa se côtoient au coucher du soleil, avant que les étals de nourriture n'envahissent la place.`,
    mustSee: [
      'Jemaa el-Fna & les souks',
      'Palais Bahia & Palais Badi',
      'Jardin Majorelle & Musée Yves Saint Laurent',
      'La Koutoubia — mosquée emblématique',
      'Saadian Tombs (Tombeaux Saadiens)',
      'Medina historique classée UNESCO',
      'Ouzoud : cascades à 3h',
    ],
    tip: '💡 <strong>Conseil :</strong> Logez dans un riad de la médina pour une expérience authentique. Évitez les faux guides dans les souks — munissez-vous d\'une carte et explorez par vous-même !',
  },
  fes: {
    img: 'https://images.unsplash.com/photo-1539020140153-e479b8c8e9bc?w=800&q=90',
    name: 'Fès',
    subtitle: 'La Capitale Spirituelle',
    rating: '★★★★★ 4.8/5',
    desc: `Fès est la plus ancienne des villes impériales du Maroc et l'une des plus anciennes villes du monde islamique encore habitées. Fondée en 789 par Idris Ier, elle abrite l'université Al-Qarawiyyin — la plus ancienne université en activité au monde (859 apr. J.-C.).

La médina de Fès el-Bali est un labyrinthe de 9 400 ruelles où le temps semble suspendu. Elle est classée au Patrimoine Mondial de l'UNESCO depuis 1981.`,
    mustSee: [
      'Tanneries Chouara — vue depuis les terrasses',
      'Université Al-Qarawiyyin (fondée en 859)',
      'Medersa Bou Inania — chef-d\'œuvre Mérinide',
      'Souk el-Attarine — épices et parfums',
      'Fondouk el-Najjarine — musée du bois',
      'Dar Batha — musée des arts',
      'Musée du Borj Nord',
    ],
    tip: '💡 <strong>Conseil :</strong> Fès est meilleure au printemps et en automne. Engagez un guide officiel (visible au badge) — la médina est si dense qu\'il est facile de se perdre, et cela fait partie du charme !',
  },
  chefchaouen: {
    img: 'https://images.unsplash.com/photo-1548019979-a6e9a8c3d4c7?w=800&q=90',
    name: 'Chefchaouen',
    subtitle: 'La Perle Bleue du Rif',
    rating: '★★★★★ 4.9/5',
    desc: `Nichée dans les montagnes du Rif, Chefchaouen (ou Chaouen) est la ville bleue par excellence. Ses maisons et ruelles peintes de toutes les nuances de bleu — du cobalt au turquoise en passant par l'indigo — en font l'une des villes les plus photographiées d'Afrique.

Fondée en 1471, la ville abrite une médina authentique où artisans et habitants vivent au rythme traditionnel. L'atmosphère y est plus calme et posée qu'à Marrakech ou Fès.`,
    mustSee: [
      'La médina bleue — chaque ruelle est un tableau',
      'Place Uta el-Hammam & la grande mosquée',
      'Kasbah et son musée',
      'Randonnée à Jebel El Kelaa (vue panoramique)',
      'Cascade d\'Akchour — 30 min',
      'Souks artisanaux (laine, cuir, argent)',
    ],
    tip: '💡 <strong>Conseil :</strong> Venez tôt le matin pour photographier les ruelles sans foule. L\'heure dorée au coucher du soleil sur la médina bleue est un spectacle inoubliable.',
  },
  sahara: {
    img: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=800&q=90',
    name: 'Merzouga & Sahara',
    subtitle: 'Le Grand Désert',
    rating: '★★★★★ 5.0/5',
    desc: `L'Erg Chebbi, près de Merzouga, est la porte du Sahara marocain — un océan de dunes dorées pouvant atteindre 150 mètres de hauteur. L'expérience de la nuit sous les étoiles dans le désert, après une traversée en dromadaire au coucher du soleil, est universellement décrite comme un moment de vie inoubliable.

La région offre aussi des oasis, des villages ksar et une faune désertique unique.`,
    mustSee: [
      'Lever et coucher de soleil sur les dunes',
      'Randonnée en dromadaire',
      'Nuit en camp de luxe au cœur du désert',
      'Étoiles du Sahara (ciel exceptionnellement pur)',
      'Village de Khamlia — musique Gnawa',
      'Oasis de Figuig',
      'Gorges du Todgha & du Dadès (en route)',
    ],
    tip: '💡 <strong>Conseil :</strong> Prévoyez au minimum une nuit sur place. Emportez un keffieh pour vous protéger du sable. Réservez un camp de bonne réputation — les prix varient énormément.',
  },
  casablanca: {
    img: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=90',
    name: 'Casablanca',
    subtitle: 'La Métropole du Maroc',
    rating: '★★★★ 4.6/5',
    desc: `Casablanca est la plus grande ville du Maroc et son poumon économique. Ville moderne et cosmopolite, elle est célèbre pour la grandiose Mosquée Hassan II, l'une des plus grandes mosquées du monde, construite sur l'océan Atlantique.

Contrairement aux idées reçues, "Casa" n'est pas seulement une ville de transit — elle abrite une architecture Art Déco unique au monde, une scène gastronomique effervescente et des quartiers branchés en pleine effervescence.`,
    mustSee: [
      'Mosquée Hassan II (3ème plus grande du monde)',
      'Quartier Art Déco du centre-ville',
      'Corniche Ain Diab & plages',
      'Quartier des Habous (medina nouvelle)',
      'Morocco Mall & Anfa Place',
      'Musée de la Fondation Abderrahman Slaoui',
      'Quartier Gauthier — restaurants & vie nocturne',
    ],
    tip: '💡 <strong>Conseil :</strong> La Mosquée Hassan II est l\'une des rares mosquées d\'Afrique ouverte aux non-musulmans (visite guidée obligatoire). Ne la manquez surtout pas !',
  },
  atlas: {
    img: 'https://images.unsplash.com/photo-1565771768700-ec8e24f4a4e3?w=800&q=90',
    name: 'Haut Atlas',
    subtitle: 'Le Toit de l\'Afrique du Nord',
    rating: '★★★★★ 4.8/5',
    desc: `Le Haut Atlas est la chaîne de montagnes la plus imposante d'Afrique, s'étirant sur 700 km du Maroc à l'Algérie. Le Jbel Toubkal (4 167 m) est le plus haut sommet d'Afrique du Nord et peut être gravi sans équipement technique en 2 jours.

La région est habitée par les Berbères amazighs qui y vivent selon des traditions séculaires dans des villages de pisé accrochés aux flancs des montagnes.`,
    mustSee: [
      'Ascension du Toubkal (4 167m)',
      'Vallée de l\'Ourika & cascades',
      'Village d\'Imlil — base de l\'Atlas',
      'Vallée des Roses (Kelaat M\'gouna)',
      'Station de ski Oukaimeden',
      'Aït Benhaddou (ksar UNESCO)',
      'Vallée du Draa — oasis & palmeraies',
    ],
    tip: '💡 <strong>Conseil :</strong> Pour le Toubkal, partez d\'Imlil avec un guide agréé. En hiver, le sommet nécessite crampons et piolet. La meilleure période : juin-septembre.',
  },
  essaouira: {
    img: 'https://images.unsplash.com/photo-1577791465485-b8d90f4d3609?w=800&q=90',
    name: 'Essaouira',
    subtitle: 'La Cité des Alizés',
    rating: '★★★★ 4.7/5',
    desc: `Ancienne cité portugaise et corsaire, Essaouira est une ville côtière unique au caractère bohème et artistique. Ses remparts ocre face à l'Atlantique, classés UNESCO, ses ruelles blanches et bleues et son port de pêche coloré en font une destination irrésistible.

Surnommée "La Cité des Alizés", elle est un haut lieu du kitesurf et du windsurf grâce à ses vents réguliers. Elle est aussi le berceau de la musique Gnawa et accueille chaque juin le Festival Gnaoua World Music.`,
    mustSee: [
      'Remparts et bastions (Skala de la Kasbah)',
      'Port de pêche coloré',
      'Festival Gnaoua (juin)',
      'Plage & kitesurf',
      'Médina classée UNESCO',
      'Galeries d\'art & ateliers d\'artisans',
      'Îles Purpuraires (excursion)',
    ],
    tip: '💡 <strong>Conseil :</strong> Le vent est quasi permanent — prévoyez un coupe-vent. Les sardines grillées au port sont parmi les meilleures du Maroc. Idéal pour 2-3 jours.',
  },
  rabat: {
    img: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&q=90',
    name: 'Rabat',
    subtitle: 'La Capitale Royale',
    rating: '★★★★ 4.7/5',
    desc: `Rabat, capitale administrative et politique du Maroc, est une ville royale élégante et moderne. Son ensemble historique — médina, Kasbah des Oudayas, Tour Hassan et Chellah — est classé UNESCO depuis 2012.

Contrairement à Marrakech, Rabat est souvent ignorée des touristes, ce qui en fait une perle authentique et agréable à visiter sans les foules.`,
    mustSee: [
      'Kasbah des Oudayas (jardins andalous)',
      'Tour Hassan & Mausolée Mohammed V',
      'Chellah — ruines romaines et mérinides',
      'Médina de Rabat',
      'Musée National de l\'Histoire',
      'Plage de Rabat & Sale',
      'Vallée du Bou Regreg',
    ],
    tip: '💡 <strong>Conseil :</strong> Rabat est à 45 min de Casablanca en train et peut se visiter en journée. Mais elle mérite une nuit sur place pour apprécier son atmosphère détendue.',
  },
  aitbenhaddou: {
    img: 'https://images.unsplash.com/photo-1562166963-bce7c7a8c4f5?w=800&q=90',
    name: 'Aït Benhaddou',
    subtitle: 'Le Ksar Légendaire',
    rating: '★★★★★ 4.9/5',
    desc: `Aït Benhaddou est un ksar (village fortifié) en pisé d'une beauté architecturale saisissante, classé UNESCO depuis 1987. Situé sur l'ancienne route des caravanes reliant le Sahara à Marrakech, il a servi de décor à plus de 20 films et séries : Gladiator, Lawrence d'Arabie, Game of Thrones, Babel…

La lumière de fin de journée sur les tours de pisé dorées est un spectacle absolument unique.`,
    mustSee: [
      'Visite du ksar (traversée du lit de l\'oued)',
      'Vue panoramique depuis la tour supérieure',
      'Villages voisins de Telouet et Aït Benhaddou',
      'Route des Kasbahs (N9)',
      'Ouarzazate — studios de cinéma Atlas',
      'Vallée du Draa — 100km de palmeraies',
    ],
    tip: '💡 <strong>Conseil :</strong> Venez au coucher du soleil — les tours de pisé prennent une teinte dorée-orange absolument magique. Traversez l\'oued à pied ou sur une planche (selon la saison).',
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
      ${data.desc.split('\n\n').map(p => `<p>${p}</p>`).join('')}
      <div class="modal-must-see">
        <h4>À ne pas manquer :</h4>
        <ul>
          ${data.mustSee.map(item => `<li>${item}</li>`).join('')}
        </ul>
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

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeDestModal();
    closeLightbox();
  }
});

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
        entry.target.classList.add('aos-animate');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('[data-aos]').forEach(el => observer.observe(el));
}
initAOS();

// ─── Parallax effect on hero ──────────────────────────────
window.addEventListener('scroll', () => {
  const scrolled = window.scrollY;
  const heroContent = document.querySelector('.hero-content');
  if (heroContent && scrolled < window.innerHeight) {
    heroContent.style.transform = `translateY(${scrolled * 0.3}px)`;
    heroContent.style.opacity = 1 - scrolled / (window.innerHeight * 0.7);
  }
});

// ─── Touch swipe for carousel ─────────────────────────────
let touchStartX = 0;
const cuisineCarousel = document.getElementById('cuisineCarousel');

cuisineCarousel.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
}, { passive: true });

cuisineCarousel.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) goToCarousel(cuisinePos + (dx < 0 ? 1 : -1));
}, { passive: true });

// ─── Active nav link highlighting ─────────────────────────
const sections = document.querySelectorAll('section[id]');
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    if (window.scrollY >= section.offsetTop - 100) current = section.id;
  });
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.style.color = a.getAttribute('href') === `#${current}`
      ? 'var(--gold)'
      : '';
  });
}, { passive: true });
