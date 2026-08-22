/*
 * 12 — ÉCRANS : ÉQUIPE ET PORTAIL CLIENT.
 *
 * Le portail est le seul écran d'un REGISTRE différent : pas de session, pas
 * de barre de navigation, et un vocabulaire de particulier, pas de
 * professionnel. Le mettre dans le même fichier montre où le design system
 * s'arrête et où le ton doit changer.
 *
 * ┌─ À FAIRE AVANT D'EXÉCUTER ─────────────────────────────────────────┐
 * │ Recopier dans CONFIG les identifiants renvoyés par le script 08.  │
 * └────────────────────────────────────────────────────────────────────┘
 */

const CONFIG = {
  Bouton: "",   // ex. "12:34"
  Champ: "",
  Badge: "",
  Message: "",
};

const NOM_PAGE = "Écrans — iPhone";
const page = figma.root.children.find((p) => p.name === NOM_PAGE);
if (!page) throw new Error(`Page « ${NOM_PAGE} » absente — exécuter 08-ecrans-page.js.`);
await figma.setCurrentPageAsync(page);

await figma.loadFontAsync({ family: "Inter", style: "Regular" });
await figma.loadFontAsync({ family: "Inter", style: "Medium" });
await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
await figma.loadFontAsync({ family: "Inter", style: "Bold" });

const variables = await figma.variables.getLocalVariablesAsync();
const V = (nom) => {
  const v = variables.find((x) => x.name === nom);
  if (!v) throw new Error(`Variable « ${nom} » introuvable — exécuter 01-variables.js.`);
  return v;
};
const echecs = [];
function lier(n, champ, nomVar) {
  try { n.setBoundVariable(champ, V(nomVar)); }
  catch (e) { echecs.push(`${n.name}.${champ} → ${nomVar} : ${e.message}`); }
}
function peinture(nomVar) {
  return figma.variables.setBoundVariableForPaint(
    { type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", V(nomVar));
}
function txt(contenu, taille, style, nomVar, largeur) {
  const t = figma.createText();
  t.fontName = { family: "Inter", style };
  t.characters = contenu;
  t.fontSize = taille;
  t.fills = [peinture(nomVar)];
  if (largeur) { t.textAutoResize = "HEIGHT"; t.resize(largeur, t.height); }
  return t;
}

/* Instancie une variante précise d'un jeu de variantes, ou le composant seul. */
async function instance(cle, nomVariante) {
  const id = CONFIG[cle];
  if (!id) { echecs.push(`CONFIG.${cle} vide — instance remplacée par un cadre nu`); return null; }
  const noeud = await figma.getNodeByIdAsync(id);
  if (!noeud) { echecs.push(`Composant ${cle} introuvable (${id})`); return null; }
  if (noeud.type === "COMPONENT_SET") {
    const variante = nomVariante
      ? noeud.children.find((c) => c.name === nomVariante) || noeud.defaultVariant
      : noeud.defaultVariant;
    return variante.createInstance();
  }
  return noeud.createInstance();
}

/* Carte : frame locale, pas une instance — voir l'en-tête. */
function carte(nom) {
  const c = figma.createAutoLayout("VERTICAL", { name: nom, itemSpacing: 12 });
  c.fills = [peinture("couleur/papier")];
  c.strokes = [peinture("couleur/trait")];
  c.strokeWeight = 1;
  for (const coin of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) {
    lier(c, coin, "rayon/carte");
  }
  for (const p of ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight"]) lier(c, p, "espacement/5");
  c.paddingTop = 20; c.paddingBottom = 20; c.paddingLeft = 20; c.paddingRight = 20;
  return c;
}

/* Écran : gabarit 390 de large, hauteur libre. */
function ecran(nom, x) {
  const e = figma.createAutoLayout("VERTICAL", { name: nom, itemSpacing: 0 });
  e.fills = [peinture("couleur/fond")];
  e.x = x; e.y = 0;
  e.resize(390, 844);
  e.layoutSizingHorizontal = "FIXED";
  e.layoutSizingVertical = "HUG";
  e.clipsContent = true;
  return e;
}

/* Barre de navigation, commune à tous les écrans connectés. */
function barreNav(actif) {
  const barre = figma.createAutoLayout("HORIZONTAL", {
    name: "Navigation", itemSpacing: 4, counterAxisAlignItems: "CENTER",
    paddingTop: 12, paddingBottom: 12, paddingLeft: 20, paddingRight: 20,
  });
  barre.fills = [peinture("couleur/encre")];
  const marque = txt("Plombéo", 18, "Bold", "couleur/papier");
  barre.appendChild(marque);
  const espace = figma.createFrame();
  espace.name = "espace"; espace.fills = []; espace.resize(12, 1);
  barre.appendChild(espace);
  for (const item of ["Agenda", "Demandes", "Devis", "Fact"]) {
    const t = txt(item, 14, item === actif ? "Semi Bold" : "Medium", "couleur/papier");
    t.opacity = item === actif ? 1 : 0.85;
    barre.appendChild(t);
  }
  return barre;
}

const crees = [];

/* ================================================================== */
/* Écran 7 — Équipe                                                   */
/* ================================================================== */

const equipe = ecran("07 — Équipe", 0);
equipe.y = 3000;
page.appendChild(equipe);
equipe.appendChild(barreNav(null));

const corpsEquipe = figma.createAutoLayout("VERTICAL", {
  name: "Contenu", itemSpacing: 16,
  paddingTop: 24, paddingBottom: 24, paddingLeft: 20, paddingRight: 20,
});
corpsEquipe.fills = [];
equipe.appendChild(corpsEquipe);
corpsEquipe.layoutSizingHorizontal = "FILL";

const enteteEquipe = figma.createAutoLayout("VERTICAL", { name: "En-tête", itemSpacing: 4 });
enteteEquipe.fills = [];
corpsEquipe.appendChild(enteteEquipe);
enteteEquipe.appendChild(txt("Équipe", 24, "Bold", "couleur/encre"));
enteteEquipe.appendChild(txt("Qui a accès à votre entreprise, et jusqu'où.", 14, "Regular", "couleur/attenue"));

/* Membres */
const carteMembres = carte("Membres");
corpsEquipe.appendChild(carteMembres);
carteMembres.layoutSizingHorizontal = "FILL";
carteMembres.appendChild(txt("Membres (2)", 16, "Semi Bold", "couleur/encre"));

const MEMBRES = [
  ["Antoine Dupuis", "patron@demo.plombeo.test", "Propriétaire"],
  ["Sofiane Haddad", "technicien@demo.plombeo.test", "Technicien"],
];
for (const [nom, email, role] of MEMBRES) {
  const l = figma.createAutoLayout("HORIZONTAL", {
    name: nom, itemSpacing: 12, primaryAxisAlignItems: "SPACE_BETWEEN",
  });
  l.fills = [];
  carteMembres.appendChild(l);
  l.layoutSizingHorizontal = "FILL";

  const infos = figma.createAutoLayout("VERTICAL", { name: "infos", itemSpacing: 2 });
  infos.fills = [];
  l.appendChild(infos);
  infos.appendChild(txt(nom, 16, "Medium", "couleur/encre"));
  infos.appendChild(txt(email, 14, "Regular", "couleur/attenue"));

  const b = await instance("Badge", "Ton=Neutre");
  if (b) {
    l.appendChild(b);
    const t = b.findOne((n) => n.type === "TEXT");
    if (t) { await figma.loadFontAsync(t.fontName); t.characters = role; }
  }
}

/* Invitation. Le lien n'est montré QU'UNE FOIS : la base n'en garde que
   l'empreinte. La maquette doit le dire, sinon on redessinera un écran qui
   promet de le réafficher. */
const carteInvitation = carte("Inviter");
corpsEquipe.appendChild(carteInvitation);
carteInvitation.layoutSizingHorizontal = "FILL";
carteInvitation.appendChild(txt("Inviter quelqu'un", 16, "Semi Bold", "couleur/encre"));
const noteInvitation = txt(
  "Aucun compte n'est créé maintenant : la personne invitée choisit elle-même son mot de passe.",
  14, "Regular", "couleur/attenue",
);
carteInvitation.appendChild(noteInvitation);
noteInvitation.layoutSizingHorizontal = "FILL";
noteInvitation.textAutoResize = "HEIGHT";

const champInvitation = await instance("Champ", "État=Repos");
if (champInvitation) {
  carteInvitation.appendChild(champInvitation);
  champInvitation.layoutSizingHorizontal = "FILL";
  const textes = champInvitation.findAll((n) => n.type === "TEXT");
  if (textes[0]) { await figma.loadFontAsync(textes[0].fontName); textes[0].characters = "Adresse e-mail"; }
  const saisie = textes.find((t) => t.name === "Saisie");
  if (saisie) { await figma.loadFontAsync(saisie.fontName); saisie.characters = "apprenti@exemple.fr"; }
}

const boutonInviter = await instance("Bouton", "Variante=Principal, État=Repos");
if (boutonInviter) {
  carteInvitation.appendChild(boutonInviter);
  boutonInviter.layoutSizingHorizontal = "FILL";
  const t = boutonInviter.findOne((n) => n.type === "TEXT");
  if (t) { await figma.loadFontAsync(t.fontName); t.characters = "Créer l'invitation"; }
}

/* Abonnement — rien n'encaisse, et l'écran le dit. */
const carteAbonnement = carte("Abonnement");
corpsEquipe.appendChild(carteAbonnement);
carteAbonnement.layoutSizingHorizontal = "FILL";
carteAbonnement.appendChild(txt("Abonnement", 16, "Semi Bold", "couleur/encre"));
carteAbonnement.appendChild(txt("Formule Artisan — Période d'essai", 14, "Regular", "couleur/encre"));
const noteAbonnement = txt(
  "Aucun prestataire de paiement n'est raccordé : Plombéo ne prélève rien et n'affiche aucun règlement qui n'aurait pas eu lieu.",
  14, "Regular", "couleur/attenue",
);
carteAbonnement.appendChild(noteAbonnement);
noteAbonnement.layoutSizingHorizontal = "FILL";
noteAbonnement.textAutoResize = "HEIGHT";
crees.push(equipe.id);

/* ================================================================== */
/* Écran 8 — Portail client (vue publique)                            */
/* ================================================================== */

/* Registre différent : pas de barre de navigation, pas de session. Le lien
   EST l'authentification. C'est un écran vu par un particulier, pas par un
   professionnel — le vocabulaire change avec lui. */
const portail = ecran("08 — Portail client", 440);
portail.y = 3000;
page.appendChild(portail);

const enteteportail = figma.createAutoLayout("VERTICAL", {
  name: "En-tête", itemSpacing: 4,
  paddingTop: 32, paddingBottom: 24, paddingLeft: 20, paddingRight: 20,
});
enteteportail.fills = [peinture("couleur/encre")];
portail.appendChild(enteteportail);
enteteportail.layoutSizingHorizontal = "FILL";
enteteportail.appendChild(txt("Démo — Dupuis Plomberie", 18, "Bold", "couleur/papier"));
enteteportail.appendChild(txt("Vos documents", 14, "Regular", "couleur/papier"));

const corpsPortail = figma.createAutoLayout("VERTICAL", {
  name: "Contenu", itemSpacing: 16,
  paddingTop: 24, paddingBottom: 24, paddingLeft: 20, paddingRight: 20,
});
corpsPortail.fills = [];
portail.appendChild(corpsPortail);
corpsPortail.layoutSizingHorizontal = "FILL";

corpsPortail.appendChild(txt("Vos devis", 24, "Bold", "couleur/encre"));

const carteDevisPortail = carte("Devis");
corpsPortail.appendChild(carteDevisPortail);
carteDevisPortail.layoutSizingHorizontal = "FILL";

const ligneDevisPortail = figma.createAutoLayout("HORIZONTAL", {
  name: "Ligne", itemSpacing: 12, primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER",
});
ligneDevisPortail.fills = [];
carteDevisPortail.appendChild(ligneDevisPortail);
ligneDevisPortail.layoutSizingHorizontal = "FILL";

const infosDevis = figma.createAutoLayout("VERTICAL", { name: "infos", itemSpacing: 2 });
infosDevis.fills = [];
ligneDevisPortail.appendChild(infosDevis);
infosDevis.appendChild(txt("Remplacement du chauffe-eau", 16, "Medium", "couleur/encre"));
infosDevis.appendChild(txt("8 août 2026 · 1 159,20 € TTC", 14, "Regular", "couleur/attenue"));

const badgePortail = await instance("Badge", "Ton=Neutre");
if (badgePortail) {
  ligneDevisPortail.appendChild(badgePortail);
  const t = badgePortail.findOne((n) => n.type === "TEXT");
  if (t) { await figma.loadFontAsync(t.fontName); t.characters = "À examiner"; }
}

const boutonVoir = await instance("Bouton", "Variante=Secondaire, État=Repos");
if (boutonVoir) {
  carteDevisPortail.appendChild(boutonVoir);
  boutonVoir.layoutSizingHorizontal = "FILL";
  const t = boutonVoir.findOne((n) => n.type === "TEXT");
  if (t) { await figma.loadFontAsync(t.fontName); t.characters = "Voir le devis"; }
}

const rappel = txt(
  "Ce lien vous est personnel. Il ne donne accès qu'à vos propres documents.",
  14, "Regular", "couleur/attenue",
);
corpsPortail.appendChild(rappel);
rappel.layoutSizingHorizontal = "FILL";
rappel.textAutoResize = "HEIGHT";
crees.push(portail.id);

await equipe.screenshot();
await portail.screenshot();

return {
  pageId: page.id,
  ecrans: { equipe: equipe.id, portail: portail.id },
  echecs,
  createdNodeIds: crees,
};
