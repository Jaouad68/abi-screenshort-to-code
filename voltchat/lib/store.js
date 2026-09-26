// Modèle de données de VoltChat : salons, membres, messages, réactions.
// Aucune E/S ici (sauf via load/save injectés) pour rester testable.
import { randomUUID, randomBytes } from "node:crypto";

export const LIMITES = {
  nom: 40,
  metier: 60,
  entreprise: 60,
  message: 2000,
  historique: 500, // messages conservés par salon
  page: 50, // messages renvoyés par requête
};

export const REACTIONS = ["👍", "⚡", "💡", "🔋", "🤔", "🎯"];

export const METIERS = [
  "Ingénieur·e batteries",
  "Constructeur automobile",
  "Opérateur de recharge",
  "Gestionnaire de flotte",
  "Énergéticien·ne / réseau",
  "Chercheur·se",
  "Collectivité / urbanisme",
  "Concessionnaire / après-vente",
  "Investisseur·se",
  "Consultant·e",
  "Autre",
];

export const SALONS_PAR_DEFAUT = [
  {
    id: "general",
    nom: "Général",
    icone: "⚡",
    description: "Discussions ouvertes sur la mobilité électrique de demain.",
  },
  {
    id: "batteries",
    nom: "Batteries & chimie",
    icone: "🔋",
    description: "Solide, LFP, sodium-ion, recyclage, seconde vie.",
  },
  {
    id: "recharge",
    nom: "Recharge & bornes",
    icone: "🔌",
    description: "Infrastructures, recharge ultra-rapide, interopérabilité, V2G.",
  },
  {
    id: "autonome",
    nom: "Conduite autonome & logiciel",
    icone: "🤖",
    description: "Véhicule défini par logiciel, ADAS, mises à jour OTA.",
  },
  {
    id: "flottes",
    nom: "Flottes & usages pros",
    icone: "🚚",
    description: "Électrification des flottes, TCO, logistique urbaine.",
  },
  {
    id: "reglementation",
    nom: "Réglementation & marché",
    icone: "📜",
    description: "Normes UE, ZFE, aides, fin du thermique en 2035.",
  },
  {
    id: "hydrogene",
    nom: "Hydrogène & alternatives",
    icone: "💧",
    description: "Pile à combustible, e-fuels, poids lourds.",
  },
];

const MESSAGES_D_ACCUEIL = [
  {
    salon: "general",
    auteur: { nom: "Équipe VoltChat", metier: "Modération", entreprise: "VoltChat" },
    texte:
      "Bienvenue sur VoltChat 👋 Présentez-vous en une phrase (métier, entreprise, sujet du moment) et rejoignez les salons thématiques à gauche. Règle d'or : échanges courtois et sourcés.",
  },
  {
    salon: "batteries",
    auteur: { nom: "Équipe VoltChat", metier: "Modération", entreprise: "VoltChat" },
    texte:
      "Question pour lancer le salon : sodium-ion ou LFP pour les citadines d'entrée de gamme d'ici 2030 ? Partagez vos retours terrain.",
  },
  {
    salon: "recharge",
    auteur: { nom: "Équipe VoltChat", metier: "Modération", entreprise: "VoltChat" },
    texte:
      "Le V2G (vehicle-to-grid) peut-il devenir un vrai levier de flexibilité réseau ? Quels freins voyez-vous : normes, contrats, garanties batteries ?",
  },
];

/** Nettoie une chaîne saisie par l'utilisateur. */
export function nettoyer(valeur, max) {
  if (typeof valeur !== "string") return "";
  return valeur
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

/** Valide un profil. Renvoie { ok, profil } ou { ok: false, erreur }. */
export function validerProfil(entree) {
  const nom = nettoyer(entree?.nom, LIMITES.nom).replace(/\s+/g, " ");
  const metier = nettoyer(entree?.metier, LIMITES.metier);
  const entreprise = nettoyer(entree?.entreprise, LIMITES.entreprise);
  if (nom.length < 2) return { ok: false, erreur: "Le nom doit contenir au moins 2 caractères." };
  if (!metier) return { ok: false, erreur: "Indiquez votre métier." };
  return { ok: true, profil: { nom, metier, entreprise } };
}

/** Valide le texte d'un message. */
export function validerTexte(texte) {
  if (typeof texte !== "string") return { ok: false, erreur: "Message invalide." };
  const propre = texte
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!propre) return { ok: false, erreur: "Le message est vide." };
  if (propre.length > LIMITES.message) {
    return { ok: false, erreur: `Le message dépasse ${LIMITES.message} caractères.` };
  }
  return { ok: true, texte: propre };
}

export function etatInitial(maintenant = Date.now()) {
  const etat = { salons: SALONS_PAR_DEFAUT.map((s) => ({ ...s })), messages: {}, membres: {} };
  for (const s of etat.salons) etat.messages[s.id] = [];
  MESSAGES_D_ACCUEIL.forEach((m, i) => {
    etat.messages[m.salon].push({
      id: randomUUID(),
      salon: m.salon,
      auteur: { id: "systeme", ...m.auteur },
      texte: m.texte,
      date: maintenant - (MESSAGES_D_ACCUEIL.length - i) * 60_000,
      reactions: {},
    });
  });
  return etat;
}

/**
 * Crée le store. `persister` est appelé (sans argument) après chaque mutation ;
 * c'est à l'appelant de le « debouncer ».
 */
export function creerStore(etat = etatInitial(), persister = () => {}) {
  // Garantit la présence des salons par défaut, même sur une ancienne sauvegarde.
  for (const s of SALONS_PAR_DEFAUT) {
    if (!etat.salons.some((x) => x.id === s.id)) etat.salons.push({ ...s });
    etat.messages[s.id] ??= [];
  }
  etat.membres ??= {};

  const membreParJeton = (jeton) =>
    typeof jeton === "string" ? Object.values(etat.membres).find((m) => m.jeton === jeton) : undefined;

  return {
    etat,

    salons() {
      return etat.salons.map(({ id, nom, icone, description }) => ({
        id,
        nom,
        icone,
        description,
        total: etat.messages[id]?.length ?? 0,
      }));
    },

    inscrire(entree, maintenant = Date.now()) {
      const v = validerProfil(entree);
      if (!v.ok) return v;
      const membre = {
        id: randomUUID(),
        jeton: randomBytes(24).toString("base64url"),
        ...v.profil,
        depuis: maintenant,
      };
      etat.membres[membre.id] = membre;
      persister();
      return { ok: true, membre };
    },

    membre: membreParJeton,

    public(membre) {
      if (!membre) return null;
      const { id, nom, metier, entreprise } = membre;
      return { id, nom, metier, entreprise };
    },

    messages(salonId, { avant } = {}) {
      const liste = etat.messages[salonId];
      if (!liste) return null;
      let fin = liste.length;
      if (avant) {
        const idx = liste.findIndex((m) => m.id === avant);
        if (idx >= 0) fin = idx;
      }
      const debut = Math.max(0, fin - LIMITES.page);
      return { messages: liste.slice(debut, fin), plusAnciens: debut > 0 };
    },

    publier(membre, salonId, texte, maintenant = Date.now()) {
      const liste = etat.messages[salonId];
      if (!liste) return { ok: false, erreur: "Salon introuvable." };
      const v = validerTexte(texte);
      if (!v.ok) return v;
      const message = {
        id: randomUUID(),
        salon: salonId,
        auteur: this.public(membre),
        texte: v.texte,
        date: maintenant,
        reactions: {},
      };
      liste.push(message);
      if (liste.length > LIMITES.historique) liste.splice(0, liste.length - LIMITES.historique);
      persister();
      return { ok: true, message };
    },

    /** Ajoute ou retire (bascule) la réaction d'un membre sur un message. */
    reagir(membre, salonId, messageId, emoji) {
      if (!REACTIONS.includes(emoji)) return { ok: false, erreur: "Réaction non autorisée." };
      const message = etat.messages[salonId]?.find((m) => m.id === messageId);
      if (!message) return { ok: false, erreur: "Message introuvable." };
      const qui = new Set(message.reactions[emoji] ?? []);
      if (qui.has(membre.id)) qui.delete(membre.id);
      else qui.add(membre.id);
      if (qui.size) message.reactions[emoji] = [...qui];
      else delete message.reactions[emoji];
      persister();
      return { ok: true, message };
    },
  };
}

/** Limiteur simple à fenêtre glissante : `max` actions par `fenetreMs`. */
export function creerLimiteur(max, fenetreMs) {
  const historique = new Map();
  return (cle, maintenant = Date.now()) => {
    const recents = (historique.get(cle) ?? []).filter((t) => maintenant - t < fenetreMs);
    if (recents.length >= max) {
      historique.set(cle, recents);
      return false;
    }
    recents.push(maintenant);
    historique.set(cle, recents);
    return true;
  };
}
