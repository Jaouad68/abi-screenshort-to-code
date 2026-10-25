// Format du contenu d'un parcours (procedures_catalog.content). Voir SPECS-MVP.md, section 5.

export type Answers = Record<string, string>;

/** Paires question → valeur qui doivent toutes correspondre. */
export type Condition = Record<string, string>;

export type Choice = { value: string; label: string };

export type Question = {
  id: string;
  label: string;
  choices: Choice[];
  show_if?: Condition;
};

export type Outcome = {
  id: string;
  when: Condition;
  cout_eur: number;
  cout_label?: string;
  pieces: string[];
  etapes: string[];
  delai_reponse_jours: number;
};

export type PieceRule = { when: Condition; ajouter?: string[]; retirer?: string[] };

export type Piece = {
  label: string;
  aide: string;
  max_age_months?: number;
  category: string;
  url_officielle?: string;
};

export type Champ = { label: string; aide: string; copiable?: string };

export type Etape = { label: string; aide: string; url?: string; champs?: Champ[] };

export type ProcedureContent = {
  questions: Question[];
  outcomes: Outcome[];
  pieces_conditionnelles?: PieceRule[];
  pieces: Record<string, Piece>;
  etapes: Record<string, Etape>;
};

export type Procedure = {
  slug: string;
  version: number;
  title: string;
  officialUrl: string;
  sourceUrl: string;
  sourceUpdatedAt: string;
  content: ProcedureContent;
};
