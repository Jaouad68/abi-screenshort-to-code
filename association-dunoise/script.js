/* ═══════════════════════════════════════════════════════════════
   ASSOCIATION DUNOISE — script.js
   Interactive behaviours: navbar, particles, scroll animations,
   counters, carousel, gallery, form validation
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ────────────────────────────────────────────────
   1. DOM READY WRAPPER
   ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initHamburger();
  initParticles();
  initScrollReveal();
  initCounters();
  initCarousel();
  initContactForm();
  initNewsletterForm();
  initNavActiveLinks();
  initSmoothScroll();
  initNavbarOverlayClose();
});

/* ────────────────────────────────────────────────
   2. NAVBAR — scroll behaviour
   ──────────────────────────────────────────────── */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  let lastScroll = 0;
  let ticking = false;

  function updateNavbar() {
    const scrollY = window.scrollY;
    if (scrollY > 80) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    lastScroll = scrollY;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateNavbar);
      ticking = true;
    }
  }, { passive: true });
}

/* ────────────────────────────────────────────────
   3. HAMBURGER MENU
   ──────────────────────────────────────────────── */
function initHamburger() {
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');
  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    hamburger.classList.toggle('active', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });
}

/* ────────────────────────────────────────────────
   4. NAVBAR OVERLAY CLOSE (click outside)
   ──────────────────────────────────────────────── */
function initNavbarOverlayClose() {
  document.addEventListener('click', (e) => {
    const navLinks  = document.getElementById('navLinks');
    const hamburger = document.getElementById('hamburger');
    if (!navLinks || !hamburger) return;
    if (navLinks.classList.contains('open') &&
        !navLinks.contains(e.target) &&
        !hamburger.contains(e.target)) {
      navLinks.classList.remove('open');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });
}

/* ────────────────────────────────────────────────
   5. HERO PARTICLES
   ──────────────────────────────────────────────── */
function initParticles() {
  const container = document.getElementById('heroParticles');
  if (!container) return;

  const PARTICLE_COUNT = 35;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    createParticle(container);
  }
}

function createParticle(container) {
  const p = document.createElement('div');
  p.className = 'particle';

  // Random properties
  const size    = Math.random() * 3 + 1;           // 1–4 px
  const left    = Math.random() * 100;              // %
  const delay   = Math.random() * 12;              // s
  const duration = Math.random() * 12 + 8;          // 8–20 s
  const opacity  = Math.random() * 0.4 + 0.1;      // 0.1–0.5

  // Some particles look like small crosses
  if (Math.random() > 0.7) {
    p.innerHTML = '✛';
    p.style.cssText = `
      left: ${left}%;
      bottom: -20px;
      font-size: ${size * 4}px;
      color: rgba(201,168,76,${opacity * 0.6});
      background: none;
      border-radius: 0;
      animation-delay: ${delay}s;
      animation-duration: ${duration}s;
      pointer-events: none;
    `;
  } else {
    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${left}%;
      bottom: -10px;
      opacity: ${opacity};
      animation-delay: ${delay}s;
      animation-duration: ${duration}s;
      pointer-events: none;
    `;
  }

  container.appendChild(p);
}

/* ────────────────────────────────────────────────
   6. INTERSECTION OBSERVER — REVEAL ANIMATIONS
   ──────────────────────────────────────────────── */
function initScrollReveal() {
  const elements = document.querySelectorAll('.reveal');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -60px 0px'
  });

  elements.forEach(el => observer.observe(el));
}

/* ────────────────────────────────────────────────
   7. ANIMATED COUNTERS
   ──────────────────────────────────────────────── */
function initCounters() {
  const counters = document.querySelectorAll('.chiffre-number[data-target]');
  if (!counters.length) return;

  const observerOptions = {
    threshold: 0.5,
    rootMargin: '0px 0px -40px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  counters.forEach(counter => observer.observe(counter));
}

function animateCounter(el) {
  const target   = parseInt(el.dataset.target, 10);
  const duration = 2000; // ms
  const start    = performance.now();
  const easeOut  = t => 1 - Math.pow(1 - t, 3); // cubic ease-out

  function step(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const value    = Math.round(easeOut(progress) * target);
    el.textContent = value.toLocaleString('fr-FR');
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = target.toLocaleString('fr-FR');
    }
  }

  requestAnimationFrame(step);
}

/* ────────────────────────────────────────────────
   8. TESTIMONIAL CAROUSEL
   ──────────────────────────────────────────────── */
function initCarousel() {
  const track    = document.getElementById('carouselTrack');
  const prevBtn  = document.getElementById('prevBtn');
  const nextBtn  = document.getElementById('nextBtn');
  const dotsWrap = document.getElementById('carouselDots');
  if (!track) return;

  const cards        = Array.from(track.querySelectorAll('.temoignage-card'));
  const cardCount    = cards.length;
  let currentIndex   = 0;
  let autoplayTimer  = null;
  let isAnimating    = false;

  // Determine visible cards based on viewport
  function getVisibleCount() {
    if (window.innerWidth <= 768) return 1;
    if (window.innerWidth <= 1024) return 2;
    return 3;
  }

  let visibleCount = getVisibleCount();

  function maxIndex() {
    return Math.max(0, cardCount - visibleCount);
  }

  function getCardWidth() {
    if (!cards[0]) return 0;
    return cards[0].offsetWidth + 28; // card width + gap
  }

  // Build dots
  function buildDots() {
    if (!dotsWrap) return;
    dotsWrap.innerHTML = '';
    const total = maxIndex() + 1;
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('button');
      dot.className = 'carousel-dot' + (i === currentIndex ? ' active' : '');
      dot.setAttribute('aria-label', `Aller au témoignage ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
    }
  }

  function updateDots() {
    if (!dotsWrap) return;
    dotsWrap.querySelectorAll('.carousel-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIndex);
    });
  }

  function goTo(index) {
    if (isAnimating) return;
    isAnimating = true;
    currentIndex = Math.max(0, Math.min(index, maxIndex()));
    const offset = currentIndex * getCardWidth();
    track.style.transform = `translateX(-${offset}px)`;
    updateDots();
    setTimeout(() => { isAnimating = false; }, 520);
  }

  function next() { goTo(currentIndex >= maxIndex() ? 0 : currentIndex + 1); }
  function prev() { goTo(currentIndex <= 0 ? maxIndex() : currentIndex - 1); }

  if (prevBtn) prevBtn.addEventListener('click', () => { prev(); resetAutoplay(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { next(); resetAutoplay(); });

  // Touch / swipe support
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? next() : prev();
      resetAutoplay();
    }
  }, { passive: true });

  // Autoplay
  function startAutoplay() {
    autoplayTimer = setInterval(next, 5000);
  }

  function resetAutoplay() {
    clearInterval(autoplayTimer);
    startAutoplay();
  }

  // Pause on hover
  track.addEventListener('mouseenter', () => clearInterval(autoplayTimer));
  track.addEventListener('mouseleave', startAutoplay);

  // Keyboard navigation
  document.addEventListener('keydown', e => {
    const tSection = document.getElementById('temoignages');
    if (!tSection) return;
    const rect = tSection.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      if (e.key === 'ArrowRight') { next(); resetAutoplay(); }
      if (e.key === 'ArrowLeft')  { prev(); resetAutoplay(); }
    }
  });

  // Responsive re-init
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const newVisible = getVisibleCount();
      if (newVisible !== visibleCount) {
        visibleCount = newVisible;
        currentIndex = Math.min(currentIndex, maxIndex());
        buildDots();
        goTo(currentIndex);
      }
    }, 200);
  });

  // Init
  buildDots();
  startAutoplay();
}

/* ────────────────────────────────────────────────
   9. ACTIVE NAV LINK (scroll spy)
   ──────────────────────────────────────────────── */
function initNavActiveLinks() {
  const sections  = document.querySelectorAll('section[id], footer[id]');
  const navLinks  = document.querySelectorAll('.nav-link');
  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          const href = link.getAttribute('href');
          link.classList.toggle('active', href === `#${id}`);
        });
      }
    });
  }, {
    threshold: 0.3,
    rootMargin: '-80px 0px -60% 0px'
  });

  sections.forEach(section => observer.observe(section));
}

/* ────────────────────────────────────────────────
   10. SMOOTH SCROLL (handles # links explicitly)
   ──────────────────────────────────────────────── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();

      const navbar  = document.getElementById('navbar');
      const offset  = navbar ? navbar.offsetHeight + 16 : 80;
      const top     = target.getBoundingClientRect().top + window.scrollY - offset;

      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* ────────────────────────────────────────────────
   11. CONTACT FORM
   ──────────────────────────────────────────────── */
function initContactForm() {
  const form    = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    if (!validateForm(form)) return;

    // Simulate async submission
    const btn     = form.querySelector('button[type="submit"]');
    const btnText = btn.querySelector('.btn-text');
    const originalText = btnText ? btnText.textContent : btn.textContent;

    btn.disabled = true;
    if (btnText) btnText.textContent = 'Envoi en cours…';
    else btn.textContent = 'Envoi en cours…';

    setTimeout(() => {
      btn.disabled = false;
      if (btnText) btnText.textContent = originalText;
      else btn.textContent = originalText;
      form.reset();
      if (success) {
        success.classList.add('visible');
        setTimeout(() => success.classList.remove('visible'), 5000);
      }
    }, 1400);
  });

  // Inline validation on blur
  form.querySelectorAll('input, textarea, select').forEach(field => {
    field.addEventListener('blur', () => validateField(field));
    field.addEventListener('input', () => {
      if (field.classList.contains('error')) validateField(field);
    });
  });
}

function validateField(field) {
  const value = field.value.trim();
  let error   = '';

  if (field.required && !value) {
    error = 'Ce champ est obligatoire.';
  } else if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    error = 'Adresse e-mail invalide.';
  } else if (field.type === 'checkbox' && field.required && !field.checked) {
    error = 'Veuillez cocher cette case.';
  }

  setFieldError(field, error);
  return !error;
}

function setFieldError(field, message) {
  field.classList.toggle('error', !!message);

  let errorEl = field.parentElement.querySelector('.field-error');
  if (message) {
    if (!errorEl) {
      errorEl = document.createElement('span');
      errorEl.className = 'field-error';
      errorEl.style.cssText = 'display:block;font-size:0.75rem;color:#c0392b;margin-top:4px;';
      field.parentElement.appendChild(errorEl);
    }
    errorEl.textContent = message;
  } else if (errorEl) {
    errorEl.remove();
  }
}

function validateForm(form) {
  const fields  = form.querySelectorAll('input[required], textarea[required], select[required]');
  let isValid   = true;
  fields.forEach(field => {
    if (!validateField(field)) isValid = false;
  });
  // Focus first error
  const firstError = form.querySelector('.error');
  if (firstError) firstError.focus();
  return isValid;
}

// Input error styles (injected)
(function injectInputErrorStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .form-group input.error,
    .form-group textarea.error,
    .form-group select.error {
      border-color: #c0392b !important;
      box-shadow: 0 0 0 3px rgba(192,57,43,0.1) !important;
    }
  `;
  document.head.appendChild(style);
})();

/* ────────────────────────────────────────────────
   12. NEWSLETTER FORM
   ──────────────────────────────────────────────── */
function initNewsletterForm() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    const btn   = form.querySelector('button');
    if (!input || !input.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
      input.style.borderColor = '#c0392b';
      setTimeout(() => { input.style.borderColor = ''; }, 2000);
      return;
    }

    const originalBtn = btn.textContent;
    btn.textContent = '✓';
    btn.style.background = '#27ae60';
    input.value = '';
    setTimeout(() => {
      btn.textContent = originalBtn;
      btn.style.background = '';
    }, 3000);
  });
}

/* ────────────────────────────────────────────────
   13. GALLERY LIGHTBOX-LIKE HOVER ENHANCEMENT
       (CSS handles most, JS adds keyboard hint)
   ──────────────────────────────────────────────── */
(function initGalleryA11y() {
  document.querySelectorAll('.galerie-placeholder').forEach((item, i) => {
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `Voir l'image ${i + 1} de la galerie`);

    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        // Toggle overlay visibility for keyboard users
        const overlay = item.querySelector('.galerie-overlay');
        if (overlay) {
          const currentOpacity = overlay.style.opacity;
          overlay.style.opacity = currentOpacity === '1' ? '' : '1';
        }
      }
    });
  });
})();

/* ────────────────────────────────────────────────
   14. PARALLAX — subtle hero effect
   ──────────────────────────────────────────────── */
(function initParallax() {
  const hero        = document.querySelector('.hero');
  const heroContent = document.querySelector('.hero-content');
  if (!hero || !heroContent || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        if (scrollY < window.innerHeight) {
          heroContent.style.transform = `translateY(${scrollY * 0.15}px)`;
          hero.querySelector('.hero-overlay').style.opacity = 0.4 + (scrollY / window.innerHeight) * 0.6;
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();

/* ────────────────────────────────────────────────
   15. TYPED TEXT EFFECT for hero subtitle (subtle)
   ──────────────────────────────────────────────── */
(function initTypedSubtitle() {
  const subtitle = document.querySelector('.hero-subtitle');
  if (!subtitle) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // The text is already in HTML, just add a cursor blink after init
  setTimeout(() => {
    const cursor = document.createElement('span');
    cursor.style.cssText = `
      display: inline-block;
      width: 2px;
      height: 1em;
      background: rgba(201,168,76,0.6);
      vertical-align: text-bottom;
      margin-left: 2px;
      animation: cursorBlink 1s step-end infinite;
    `;
    const style = document.createElement('style');
    style.textContent = `@keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }`;
    document.head.appendChild(style);
    subtitle.appendChild(cursor);
    // Remove cursor after 3s
    setTimeout(() => cursor.remove(), 3000);
  }, 2000);
})();

/* ────────────────────────────────────────────────
   16. BACK TO TOP BUTTON
   ──────────────────────────────────────────────── */
(function initBackToTop() {
  const btn = document.createElement('button');
  btn.className = 'back-to-top';
  btn.setAttribute('aria-label', 'Retour en haut');
  btn.innerHTML = '↑';
  btn.style.cssText = `
    position: fixed;
    bottom: 32px;
    right: 32px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 2px solid rgba(201,168,76,0.4);
    background: rgba(17,28,53,0.9);
    color: #c9a84c;
    font-size: 1.2rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
    z-index: 500;
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;

  document.body.appendChild(btn);

  let visible = false;
  window.addEventListener('scroll', () => {
    const shouldShow = window.scrollY > 500;
    if (shouldShow !== visible) {
      visible = shouldShow;
      btn.style.opacity     = visible ? '1' : '0';
      btn.style.transform   = visible ? 'translateY(0)' : 'translateY(20px)';
      btn.style.pointerEvents = visible ? 'auto' : 'none';
    }
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  btn.addEventListener('mouseenter', () => {
    btn.style.background   = '#c9a84c';
    btn.style.color        = '#111c35';
    btn.style.borderColor  = '#c9a84c';
    btn.style.transform    = 'translateY(-4px)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background   = 'rgba(17,28,53,0.9)';
    btn.style.color        = '#c9a84c';
    btn.style.borderColor  = 'rgba(201,168,76,0.4)';
    btn.style.transform    = visible ? 'translateY(0)' : 'translateY(20px)';
  });
})();

/* ────────────────────────────────────────────────
   17. TIMELINE PROGRESS (visual line fill on scroll)
   ──────────────────────────────────────────────── */
(function initTimelineFill() {
  const timelineSection = document.querySelector('.actions-section');
  if (!timelineSection) return;

  // Create fill overlay on timeline line
  const fill = document.createElement('div');
  fill.style.cssText = `
    position: absolute;
    left: 50%;
    top: 0;
    width: 2px;
    height: 0%;
    background: linear-gradient(180deg, #e2c46d 0%, #c9a84c 100%);
    transform: translateX(-50%);
    transition: height 0.1s linear;
    border-radius: 1px;
    z-index: 1;
    box-shadow: 0 0 8px rgba(201,168,76,0.5);
  `;

  const timeline = timelineSection.querySelector('.timeline');
  if (!timeline) return;
  timeline.style.position = 'relative';
  timeline.appendChild(fill);

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const rect     = timeline.getBoundingClientRect();
        const viewH    = window.innerHeight;
        const progress = Math.max(0, Math.min(1,
          (viewH - rect.top) / (rect.height + viewH)
        ));
        fill.style.height = (progress * 100) + '%';
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();

/* ────────────────────────────────────────────────
   18. STAGGERED CARD ANIMATION
       Re-delay reveal children based on DOM order
   ──────────────────────────────────────────────── */
(function staggerGridChildren() {
  const grids = document.querySelectorAll(
    '.mission-cards, .chiffres-grid, .adhesion-cards, .galerie-grid'
  );

  grids.forEach(grid => {
    const items = grid.querySelectorAll('.reveal, .galerie-item');
    items.forEach((item, i) => {
      item.style.transitionDelay = `${i * 0.08}s`;
    });
  });
})();

/* ────────────────────────────────────────────────
   19. PERFORMANCE — preload fonts hint
   ──────────────────────────────────────────────── */
(function preloadFonts() {
  if ('fonts' in document) {
    Promise.all([
      document.fonts.load('700 1em "Playfair Display"'),
      document.fonts.load('400 1em "Inter"')
    ]).then(() => document.body.classList.add('fonts-loaded'));
  }
})();

/* ────────────────────────────────────────────────
   20. ACCESSIBILITY — announce carousel slide to SR
   ──────────────────────────────────────────────── */
(function initCarouselA11y() {
  const region = document.querySelector('.carousel-container');
  if (!region) return;
  region.setAttribute('role', 'region');
  region.setAttribute('aria-label', 'Témoignages');
  region.setAttribute('aria-live', 'polite');
})();
