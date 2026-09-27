// Formulaire de contact. Le message « envoyé » ne s'affiche qu'après une réponse positive du service de réception.
(function (racine) {
  'use strict';

  var DELAI_MIN_MS = 3000; // un envoi en moins de 3 s après l'affichage est traité comme automatique
  var INTERVALLE_MS = 60000; // un seul envoi par minute depuis un même navigateur

  function valider(v) {
    var e = {};
    var nom = (v.nom || '').trim();
    var email = (v.email || '').trim();
    var message = (v.message || '').trim();
    if (!nom) e.nom = 'Indiquez votre nom.';
    else if (nom.length > 120) e.nom = 'Le nom ne doit pas dépasser 120 caractères.';
    if (!email) e.email = 'Indiquez votre adresse électronique pour que nous puissions vous répondre.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) e.email = 'L’adresse électronique semble incomplète. Exemple : prenom.nom@exemple.fr';
    if (!v.objet) e.objet = 'Choisissez l’objet de votre message.';
    if (!message) e.message = 'Écrivez votre message.';
    else if (message.length < 10) e.message = 'Votre message est trop court (10 caractères minimum).';
    else if (message.length > 5000) e.message = 'Votre message est trop long (5 000 caractères maximum).';
    return e;
  }

  function estAbusif(v, debut, maintenant, dernierEnvoi) {
    if (v._gotcha) return 'piege';
    if (!debut || maintenant - debut < DELAI_MIN_MS) return 'trop-rapide';
    if (dernierEnvoi && maintenant - dernierEnvoi < INTERVALLE_MS) return 'trop-frequent';
    return '';
  }

  function lireDernierEnvoi() {
    try { return Number(localStorage.getItem('md-dernier-envoi')) || 0; } catch (err) { return 0; }
  }
  function noterEnvoi(t) {
    try { localStorage.setItem('md-dernier-envoi', String(t)); } catch (err) { /* stockage indisponible : sans conséquence */ }
  }

  function brancher(form) {
    var debut = Date.now();
    form.querySelector('[name="debut"]').value = String(debut);
    var statut = form.querySelector('.form-statut');
    var bouton = form.querySelector('button[type="submit"]');
    var champs = ['nom', 'email', 'objet', 'message'];

    function afficherStatut(texte, classe) {
      statut.className = 'form-statut ' + classe;
      statut.textContent = texte;
      statut.focus();
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var fd = new FormData(form);
      var v = {};
      fd.forEach(function (val, cle) { v[cle] = typeof val === 'string' ? val : ''; });
      var erreurs = valider(v);
      var premier = null;
      champs.forEach(function (c) {
        var input = form.elements[c];
        var p = document.getElementById('c-' + c + '-err');
        if (erreurs[c]) {
          input.setAttribute('aria-invalid', 'true');
          p.textContent = erreurs[c];
          p.hidden = false;
          if (!premier) premier = input;
        } else {
          input.removeAttribute('aria-invalid');
          p.textContent = '';
          p.hidden = true;
        }
      });
      if (premier) {
        afficherStatut('Le message n’a pas été envoyé : ' + Object.keys(erreurs).length + ' champ(s) à corriger.', 'echec');
        premier.focus();
        return;
      }
      var abus = estAbusif(v, debut, Date.now(), lireDernierEnvoi());
      if (abus === 'trop-frequent') {
        afficherStatut('Un message vient déjà d’être envoyé depuis ce navigateur. Merci de patienter une minute avant un nouvel envoi.', 'echec');
        return;
      }
      if (abus === 'trop-rapide') {
        afficherStatut('Merci de vérifier votre message quelques secondes, puis de l’envoyer à nouveau.', 'echec');
        return;
      }
      if (abus === 'piege') {
        // Envoi automatisé probable : rien n'est transmis, et aucun succès n'est annoncé.
        afficherStatut('Le message n’a pas pu être envoyé.', 'echec');
        return;
      }

      bouton.disabled = true;
      afficherStatut('Envoi en cours…', '');
      var controle = typeof AbortController === 'function' ? new AbortController() : null;
      var minuterie = setTimeout(function () { if (controle) controle.abort(); }, 15000);
      fetch(form.getAttribute('data-endpoint'), {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: fd,
        signal: controle ? controle.signal : undefined,
      })
        .then(function (rep) {
          return rep.json().catch(function () { return {}; }).then(function (json) { return { ok: rep.ok, json: json }; });
        })
        .then(function (r) {
          // Réception confirmée : statut HTTP 2xx et aucune erreur signalée par le service.
          if (r.ok && r.json && r.json.ok !== false && !r.json.errors) {
            noterEnvoi(Date.now());
            form.reset();
            afficherStatut('Votre message a bien été reçu. Nous vous répondrons à l’adresse indiquée.', 'succes');
          } else {
            afficherStatut('Le service de réception a refusé le message. Vérifiez vos informations et réessayez ; si le problème persiste, utilisez les coordonnées indiquées sur cette page.', 'echec');
          }
        })
        .catch(function () {
          afficherStatut('Le message n’a pas pu être envoyé (connexion impossible ou délai dépassé). Votre texte est conservé : réessayez dans un instant.', 'echec');
        })
        .then(function () {
          clearTimeout(minuterie);
          bouton.disabled = false;
        });
    });
  }

  var api = { valider: valider, estAbusif: estAbusif, brancher: brancher };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else racine.MDForm = api;
})(typeof window !== 'undefined' ? window : globalThis);
