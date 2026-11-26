// Sillon, page d'abonnement : petites interactions, la page reste lisible sans JavaScript.
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Mot qui change dans le titre. Arrêté si l'utilisateur préfère moins d'animations.
  const rotator = document.querySelector('[data-rotator]');
  if (rotator) {
    const words = [...rotator.children];
    let i = 0;
    setInterval(() => {
      if (reduceMotion.matches || document.hidden) return;
      words[i].setAttribute('aria-hidden', 'true');
      i = (i + 1) % words.length;
      words[i].removeAttribute('aria-hidden');
    }, 2400);
  }

  // Menu mobile
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('menu-mobile');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      menu.hidden = open;
    });
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) { toggle.setAttribute('aria-expanded', 'false'); menu.hidden = true; }
    });
  }

  // Menu déroulant des formules : fermer au clic extérieur et à Échap
  const dropdown = document.querySelector('.dropdown');
  if (dropdown) {
    document.addEventListener('click', (e) => { if (!dropdown.contains(e.target)) dropdown.open = false; });
    dropdown.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { dropdown.open = false; dropdown.querySelector('summary').focus(); }
    });
    dropdown.addEventListener('click', (e) => { if (e.target.closest('a')) dropdown.open = false; });
  }

  // Mise en avant de la carte choisie depuis un menu
  document.querySelectorAll('[data-highlight]').forEach((link) => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.plan.is-highlighted').forEach((p) => p.classList.remove('is-highlighted'));
      const card = document.querySelector(`.plan[data-plan="${link.dataset.highlight}"]`);
      if (card) card.classList.add('is-highlighted');
    });
  });

  // Bouton collant sur mobile, visible une fois le bouton du haut sorti de l'écran
  const sticky = document.querySelector('[data-sticky]');
  const heroCta = document.getElementById('hero-cta');
  const plans = document.getElementById('formules');
  if (sticky && heroCta && 'IntersectionObserver' in window) {
    let heroGone = false, plansIn = false;
    const update = () => sticky.classList.toggle('is-visible', heroGone && !plansIn);
    new IntersectionObserver(([e]) => { heroGone = !e.isIntersecting && e.boundingClientRect.top < 0; update(); }).observe(heroCta);
    if (plans) new IntersectionObserver(([e]) => { plansIn = e.isIntersecting; update(); }, { threshold: 0.15 }).observe(plans);
  }

  // Démo : l'inscription n'est pas branchée, on le dit clairement
  const toast = document.querySelector('[data-toast]');
  let timer;
  document.querySelectorAll('[data-plan-cta]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!toast) return;
      toast.textContent = `Formule ${btn.dataset.planCta} choisie. L'inscription arrive bientôt sur cette démo.`;
      toast.hidden = false;
      clearTimeout(timer);
      timer = setTimeout(() => { toast.hidden = true; }, 3500);
    });
  });
})();
