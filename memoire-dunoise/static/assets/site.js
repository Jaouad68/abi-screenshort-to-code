// Mémoire dunoise — améliorations progressives. Le site reste entièrement lisible sans JavaScript.
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  // Menu sur petit écran : bouton de divulgation.
  var bouton = document.querySelector('.menu-bouton');
  var nav = document.getElementById('navigation');
  if (bouton && nav) {
    bouton.hidden = false;
    bouton.addEventListener('click', function () {
      var ouvert = bouton.getAttribute('aria-expanded') === 'true';
      bouton.setAttribute('aria-expanded', String(!ouvert));
      nav.classList.toggle('ouvert', !ouvert);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && bouton.getAttribute('aria-expanded') === 'true') {
        bouton.setAttribute('aria-expanded', 'false');
        nav.classList.remove('ouvert');
        bouton.focus();
      }
    });
  }

  // Visionneuse d'image accessible (élément <dialog> natif : piège du focus et touche Échap gérés par le navigateur).
  var declencheurs = document.querySelectorAll('[data-agrandir]');
  if (declencheurs.length && typeof HTMLDialogElement === 'function') {
    var dlg = document.createElement('dialog');
    dlg.className = 'visionneuse';
    dlg.setAttribute('aria-labelledby', 'visionneuse-titre');
    dlg.innerHTML =
      '<div class="visionneuse-barre"><p id="visionneuse-titre"></p>' +
      '<button type="button" class="visionneuse-fermer">Fermer</button></div><img alt="">';
    document.body.appendChild(dlg);
    var img = dlg.querySelector('img');
    var titre = dlg.querySelector('#visionneuse-titre');
    var dernier = null;
    dlg.querySelector('.visionneuse-fermer').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { if (dernier) dernier.focus(); });
    declencheurs.forEach(function (b) {
      b.hidden = false;
      b.addEventListener('click', function () {
        dernier = b;
        img.src = b.getAttribute('data-agrandir');
        img.alt = b.getAttribute('data-alt') || '';
        titre.textContent = b.getAttribute('data-legende') || '';
        dlg.showModal();
        dlg.querySelector('.visionneuse-fermer').focus();
      });
    });
  }

  // Événements : un événement dont la date est passée rejoint la liste des événements passés,
  // même si le site n'a pas été régénéré depuis.
  var avenir = document.querySelector('[data-liste="avenir"]');
  var passes = document.querySelector('[data-liste="passes"]');
  if (avenir && passes) {
    var d = new Date();
    var auj = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    Array.prototype.slice.call(avenir.children).forEach(function (li) {
      if (li.getAttribute('data-date') < auj) passes.insertBefore(li, passes.firstChild);
    });
    var vide = document.querySelector('[data-vide="avenir"]');
    if (vide) vide.hidden = avenir.children.length > 0;
  }
  document.querySelectorAll('[data-masquable]').forEach(function (s) {
    var ul = s.querySelector('ul');
    s.hidden = !ul || ul.children.length === 0;
  });

  // Filtre de liste (activé seulement pour les collections suffisamment fournies).
  document.querySelectorAll('[data-filtre]').forEach(function (champ) {
    var liste = document.querySelector(champ.getAttribute('data-filtre'));
    var compte = champ.parentNode.querySelector('.filtre-compte');
    champ.addEventListener('input', function () {
      var q = champ.value.trim().toLowerCase();
      var n = 0;
      Array.prototype.forEach.call(liste.children, function (li) {
        var ok = !q || (li.getAttribute('data-texte') || '').indexOf(q) !== -1;
        li.hidden = !ok;
        if (ok) n++;
      });
      compte.textContent = n + (n > 1 ? ' fiches affichées' : ' fiche affichée');
    });
  });

  // Formulaire de contact : validation compréhensible, anti-abus, et confirmation uniquement après accusé technique.
  var form = document.getElementById('formulaire-contact');
  if (form && window.MDForm) window.MDForm.brancher(form);
})();
