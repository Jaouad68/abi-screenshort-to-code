// Modèle de données de VoltChat : salons, conversations privées, membres,
// messages, réactions, signalements. Aucune E/S ici (sauf via `persister`)
// pour rester testable.
import { randomUUID, randomBytes } from "node:crypto";

export const LIMITES = {
  nom: 40,
  metier: 60,
  entreprise: 60,
  message: 2000,
  motif: 200,
  historique: 500, // messages conservés par fil
  page: 50, // messages renvoyés par requête
};

/** Durée de validité d'une session, prolongée à chaque reconnexion. */
export const DUREE_SESSION = 30 * 24 * 3600_000;

export const REACTIONS = ["👍", "⚡", "💡", "🔋", "🤔", "🎯"];

export const MOTIFS_SIGNALEMENT = ["Spam ou publicité", "Propos déplacés", "Hors sujet", "Fausse information", "Autre"];

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
      "Bienvenue sur VoltChat 👋 Présentez-vous en une phrase (métier, entreprise, sujet du moment) et rejoignez les salons thématiques. Règle d'or : échanges courtois et sourcés.",
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

const CARACTERES_CONTROLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Nettoie une chaîne saisie par l'utilisateur. */
export function nettoyer(valeur, max) {
  if (typeof valeur !== "string") return "";
  return valeur.replace(CARACTERES_CONTROLE, "").trim().slice(0, max);
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
  const propre = texte.replace(CARACTERES_CONTROLE, "").replace(/\n{3,}/g, "\n\n").trim();
  if (!propre) return { ok: false, erreur: "Le message est vide." };
  if (propre.length > LIMITES.message) {
    return { ok: false, erreur: `Le message dépasse ${LIMITES.message} caractères.` };
  }
  return { ok: true, texte: propre };
}

export function etatInitial(maintenant = Date.now()) {
  const etat = {
    salons: SALONS_PAR_DEFAUT.map((s) => ({ ...s })),
    conversations: {},
    messages: {},
    membres: {},
    signalements: [],
  };
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

const nouveauJeton = () => randomBytes(24).toString("base64url");

/**
 * Crée le store. `persister` est appelé (sans argument) après chaque mutation ;
 * c'est à l'appelant de le « debouncer ».
 */
export function creerStore(etat = etatInitial(), persister = () => {}) {
  // Complète une ancienne sauvegarde avec ce qui a été ajouté depuis.
  for (const s of SALONS_PAR_DEFAUT) {
    if (!etat.salons.some((x) => x.id === s.id)) etat.salons.push({ ...s });
    etat.messages[s.id] ??= [];
  }
  etat.membres ??= {};
  etat.conversations ??= {};
  etat.signalements ??= [];

  const estModerateur = (membre) => membre?.role === "moderateur";
  const trouverMessage = (filId, messageId) => etat.messages[filId]?.find((m) => m.id === messageId);

  const store = {
    etat,
    estModerateur,

    salons() {
      return etat.salons.map(({ id, nom, icone, description }) => ({
        id,
        nom,
        icone,
        description,
        total: etat.messages[id]?.length ?? 0,
      }));
    },

    // ---------- Membres & sessions ----------

    inscrire(entree, maintenant = Date.now(), { moderateur = false } = {}) {
      const v = validerProfil(entree);
      if (!v.ok) return v;
      const membre = {
        id: randomUUID(),
        jeton: nouveauJeton(),
        jetonExpire: maintenant + DUREE_SESSION,
        ...v.profil,
        role: moderateur ? "moderateur" : "membre",
        depuis: maintenant,
      };
      etat.membres[membre.id] = membre;
      persister();
      return { ok: true, membre };
    },

    /** Membre correspondant à un jeton valide (non expiré, non exclu). */
    membre(jeton, maintenant = Date.now()) {
      if (typeof jeton !== "string" || !jeton) return undefined;
      const m = Object.values(etat.membres).find((x) => x.jeton === jeton);
      if (!m || m.exclu) return undefined;
      if ((m.jetonExpire ?? Infinity) <= maintenant) return undefined;
      return m;
    },

    prolonger(membre, maintenant = Date.now()) {
      membre.jetonExpire = maintenant + DUREE_SESSION;
      persister();
    },

    /** Invalide le jeton courant (déconnexion). */
    deconnecter(membre) {
      membre.jeton = nouveauJeton();
      membre.jetonExpire = 0;
      persister();
    },

    public(membre) {
      if (!membre) return null;
      const { id, nom, metier, entreprise, role } = membre;
      return { id, nom, metier, entreprise, role: role ?? "membre" };
    },

    // ---------- Fils (salons publics + conversations privées) ----------

    /** Le membre peut-il lire / écrire dans ce fil ? */
    peutAcceder(membre, filId) {
      if (etat.salons.some((s) => s.id === filId)) return true;
      const c = etat.conversations[filId];
      return Boolean(c && membre && c.participants.includes(membre.id));
    },

    /** Participants d'une conversation privée, ou null pour un salon public. */
    participants(filId) {
      return etat.conversations[filId]?.participants ?? null;
    },

    /** Ouvre (ou retrouve) la conversation privée entre deux membres. */
    conversation(membre, autreId, maintenant = Date.now()) {
      const autre = etat.membres[autreId];
      if (!autre || autre.exclu) return { ok: false, erreur: "Membre introuvable." };
      if (autre.id === membre.id) return { ok: false, erreur: "Impossible de s'écrire à soi-même." };
      const existante = Object.values(etat.conversations).find(
        (c) => c.participants.includes(membre.id) && c.participants.includes(autre.id),
      );
      if (existante) return { ok: true, conversation: existante, cree: false };
      const conversation = { id: `dm-${randomUUID()}`, participants: [membre.id, autre.id], creee: maintenant };
      etat.conversations[conversation.id] = conversation;
      etat.messages[conversation.id] = [];
      persister();
      return { ok: true, conversation, cree: true };
    },

    /** Conversations privées d'un membre, de la plus récente à la plus ancienne. */
    conversationsDe(membre) {
      return Object.values(etat.conversations)
        .filter((c) => c.participants.includes(membre.id))
        .map((c) => {
          const liste = etat.messages[c.id] ?? [];
          const autre = etat.membres[c.participants.find((id) => id !== membre.id)];
          return {
            id: c.id,
            avec: this.public(autre),
            total: liste.length,
            dernier: liste.at(-1)?.date ?? c.creee,
          };
        })
        .filter((c) => c.avec)
        .sort((a, b) => b.dernier - a.dernier);
    },

    // ---------- Messages ----------

    messages(filId, { avant } = {}) {
      const liste = etat.messages[filId];
      if (!liste) return null;
      let fin = liste.length;
      if (avant) {
        const idx = liste.findIndex((m) => m.id === avant);
        if (idx >= 0) fin = idx;
      }
      const debut = Math.max(0, fin - LIMITES.page);
      return { messages: liste.slice(debut, fin), plusAnciens: debut > 0 };
    },

    publier(membre, filId, texte, maintenant = Date.now()) {
      const liste = etat.messages[filId];
      if (!liste || !this.peutAcceder(membre, filId)) return { ok: false, erreur: "Salon introuvable." };
      const v = validerTexte(texte);
      if (!v.ok) return v;
      const message = {
        id: randomUUID(),
        salon: filId,
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

    /** Modifie le texte d'un message : réservé à son auteur. */
    modifier(membre, filId, messageId, texte, maintenant = Date.now()) {
      const message = trouverMessage(filId, messageId);
      if (!message) return { ok: false, erreur: "Message introuvable." };
      if (message.auteur.id !== membre.id) return { ok: false, statut: 403, erreur: "Vous ne pouvez modifier que vos messages." };
      const v = validerTexte(texte);
      if (!v.ok) return v;
      if (v.texte !== message.texte) {
        message.texte = v.texte;
        message.modifie = maintenant;
        persister();
      }
      return { ok: true, message };
    },

    /** Supprime un message : son auteur ou un modérateur (salons publics). */
    supprimer(membre, filId, messageId) {
      const liste = etat.messages[filId];
      const idx = liste?.findIndex((m) => m.id === messageId) ?? -1;
      if (idx < 0) return { ok: false, erreur: "Message introuvable." };
      const auteur = liste[idx].auteur.id === membre.id;
      const moderation = estModerateur(membre) && !etat.conversations[filId];
      if (!auteur && !moderation) return { ok: false, statut: 403, erreur: "Suppression non autorisée." };
      const [message] = liste.splice(idx, 1);
      etat.signalements = etat.signalements.filter((s) => s.messageId !== messageId);
      persister();
      return { ok: true, message };
    },

    /** Ajoute ou retire (bascule) la réaction d'un membre sur un message. */
    reagir(membre, filId, messageId, emoji) {
      if (!REACTIONS.includes(emoji)) return { ok: false, erreur: "Réaction non autorisée." };
      const message = trouverMessage(filId, messageId);
      if (!message) return { ok: false, erreur: "Message introuvable." };
      const qui = new Set(message.reactions[emoji] ?? []);
      if (qui.has(membre.id)) qui.delete(membre.id);
      else qui.add(membre.id);
      if (qui.size) message.reactions[emoji] = [...qui];
      else delete message.reactions[emoji];
      persister();
      return { ok: true, message };
    },

    // ---------- Modération ----------

    signaler(membre, filId, messageId, motif, maintenant = Date.now()) {
      if (etat.conversations[filId]) return { ok: false, erreur: "Les conversations privées ne sont pas modérées." };
      const message = trouverMessage(filId, messageId);
      if (!message) return { ok: false, erreur: "Message introuvable." };
      if (message.auteur.id === membre.id) return { ok: false, erreur: "Vous ne pouvez pas signaler votre propre message." };
      if (message.auteur.id === "systeme") return { ok: false, erreur: "Ce message ne peut pas être signalé." };
      const propre = nettoyer(motif, LIMITES.motif);
      if (!propre) return { ok: false, erreur: "Indiquez un motif." };
      const deja = etat.signalements.find((s) => s.messageId === messageId && s.par.id === membre.id);
      if (deja) return { ok: true, signalement: deja, nouveau: false };
      const signalement = {
        id: randomUUID(),
        salon: filId,
        messageId,
        extrait: message.texte.slice(0, 280),
        auteur: message.auteur,
        par: this.public(membre),
        motif: propre,
        date: maintenant,
      };
      etat.signalements.push(signalement);
      persister();
      return { ok: true, signalement, nouveau: true };
    },

    signalements() {
      return [...etat.signalements].sort((a, b) => b.date - a.date);
    },

    ignorerSignalement(id) {
      const avant = etat.signalements.length;
      etat.signalements = etat.signalements.filter((s) => s.id !== id);
      if (etat.signalements.length === avant) return { ok: false, erreur: "Signalement introuvable." };
      persister();
      return { ok: true };
    },

    /**
     * Exclut un membre (modérateur uniquement) : sa session est révoquée et
     * ses messages publics sont supprimés. Renvoie les messages retirés.
     */
    exclure(moderateur, membreId) {
      if (!estModerateur(moderateur)) return { ok: false, statut: 403, erreur: "Action réservée aux modérateurs." };
      const cible = etat.membres[membreId];
      if (!cible || cible.exclu) return { ok: false, erreur: "Membre introuvable." };
      if (cible.id === moderateur.id || estModerateur(cible)) {
        return { ok: false, erreur: "Impossible d'exclure un modérateur." };
      }
      cible.exclu = true;
      cible.jeton = nouveauJeton();
      cible.jetonExpire = 0;
      const retires = [];
      for (const s of etat.salons) {
        const liste = etat.messages[s.id];
        for (let i = liste.length - 1; i >= 0; i--) {
          if (liste[i].auteur.id === cible.id) retires.push(...liste.splice(i, 1));
        }
      }
      const ids = new Set(retires.map((m) => m.id));
      etat.signalements = etat.signalements.filter((s) => !ids.has(s.messageId) && s.auteur.id !== cible.id);
      persister();
      return { ok: true, membre: cible, retires };
    },
  };
  return store;
}

/**
 * Limiteur simple à fenêtre glissante : `max` actions par `fenetreMs`.
 * `limiteur.nettoyer()` libère les clés inactives (à appeler périodiquement).
 */
export function creerLimiteur(max, fenetreMs) {
  const historique = new Map();
  const limiteur = (cle, maintenant = Date.now()) => {
    const recents = (historique.get(cle) ?? []).filter((t) => maintenant - t < fenetreMs);
    if (recents.length >= max) {
      historique.set(cle, recents);
      return false;
    }
    recents.push(maintenant);
    historique.set(cle, recents);
    return true;
  };
  limiteur.nettoyer = (maintenant = Date.now()) => {
    for (const [cle, dates] of historique) {
      if (!dates.some((t) => maintenant - t < fenetreMs)) historique.delete(cle);
    }
  };
  limiteur.taille = () => historique.size;
  return limiteur;
}
