import type { ComponentProps, ReactNode } from "react";

/*
 * Composants du design system (§73).
 *
 * Contrainte transverse : toute cible tactile fait au moins 44 px de haut
 * (min-h-11), seuil en dessous duquel une saisie au pouce devient imprécise.
 */

const BASE_BOUTON =
  "inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-controle " +
  "font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

const VARIANTES_BOUTON = {
  principal: "bg-action text-white hover:bg-action-fonce",
  secondaire: "bg-encre text-white hover:bg-encre-clair",
  discret: "bg-white text-encre border border-trait hover:bg-fond",
} as const;

export function Bouton({
  variante = "principal",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: keyof typeof VARIANTES_BOUTON }) {
  return <button className={`${BASE_BOUTON} ${VARIANTES_BOUTON[variante]} ${className}`} {...props} />;
}

export function Carte({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`bg-papier border border-trait rounded-carte p-5 ${className}`}
    >
      {children}
    </section>
  );
}

/**
 * Champ de formulaire.
 *
 * Le `<label>` est toujours associé au champ via `htmlFor` : un placeholder ne
 * remplace pas une étiquette, il disparaît à la saisie (§61).
 * L'erreur est reliée par `aria-describedby` pour être annoncée par les
 * lecteurs d'écran, et jamais signalée par la seule couleur.
 */
export function Champ({
  id,
  libelle,
  aide,
  erreur,
  ...props
}: ComponentProps<"input"> & { id: string; libelle: string; aide?: string; erreur?: string }) {
  const idAide = aide ? `${id}-aide` : undefined;
  const idErreur = erreur ? `${id}-erreur` : undefined;
  const decrit = [idAide, idErreur].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-semibold text-sm">
        {libelle}
      </label>
      {aide && (
        <p id={idAide} className="text-sm text-attenue">
          {aide}
        </p>
      )}
      <input
        id={id}
        aria-describedby={decrit}
        aria-invalid={erreur ? true : undefined}
        className="min-h-11 px-3 rounded-controle border border-trait bg-white
                   focus:border-action"
        {...props}
      />
      {erreur && (
        <p id={idErreur} className="text-sm text-danger font-medium">
          {erreur}
        </p>
      )}
    </div>
  );
}

/** Zone de texte multiligne, mêmes règles d'accessibilité que `Champ`. */
export function ZoneTexte({
  id,
  libelle,
  aide,
  ...props
}: ComponentProps<"textarea"> & { id: string; libelle: string; aide?: string }) {
  const idAide = aide ? `${id}-aide` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-semibold text-sm">
        {libelle}
      </label>
      {aide && (
        <p id={idAide} className="text-sm text-attenue">
          {aide}
        </p>
      )}
      <textarea
        id={id}
        aria-describedby={idAide}
        rows={3}
        className="px-3 py-2 rounded-controle border border-trait bg-white focus:border-action"
        {...props}
      />
    </div>
  );
}

/** Liste déroulante. */
export function Selection({
  id,
  libelle,
  options,
  ...props
}: ComponentProps<"select"> & {
  id: string;
  libelle: string;
  options: readonly { valeur: string; libelle: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-semibold text-sm">
        {libelle}
      </label>
      <select
        id={id}
        className="min-h-11 px-3 rounded-controle border border-trait bg-white focus:border-action"
        {...props}
      >
        {options.map((o) => (
          <option key={o.valeur} value={o.valeur}>
            {o.libelle}
          </option>
        ))}
      </select>
    </div>
  );
}

/** État vide d'une liste. Explique quoi faire plutôt que d'afficher un vide muet. */
export function ListeVide({ titre, children }: { titre: string; children?: ReactNode }) {
  return (
    <Carte className="border-dashed text-center">
      <p className="font-semibold">{titre}</p>
      {children && <div className="text-sm text-attenue mt-2">{children}</div>}
    </Carte>
  );
}

const TONS_BADGE = {
  neutre: "bg-fond text-attenue border-trait",
  succes: "bg-[#e8f4ed] text-succes border-[#bcdcc9]",
  alerte: "bg-[#fdf3e2] text-alerte border-[#eed9ae]",
  danger: "bg-[#fdeceb] text-danger border-[#f2c9c6]",
} as const;

/** Badge de statut. Le libellé porte l'information ; la couleur ne fait que la renforcer. */
export function Badge({
  ton = "neutre",
  children,
}: {
  ton?: keyof typeof TONS_BADGE;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${TONS_BADGE[ton]}`}
    >
      {children}
    </span>
  );
}

/** Message de retour d'action (succès ou erreur), annoncé aux lecteurs d'écran. */
export function Message({ ton, children }: { ton: "succes" | "erreur"; children: ReactNode }) {
  const succes = ton === "succes";
  return (
    <p
      role={succes ? "status" : "alert"}
      className={`text-sm font-medium rounded-controle px-3 py-2 border ${
        succes
          ? "text-succes bg-[#e8f4ed] border-[#bcdcc9]"
          : "text-danger bg-[#fdeceb] border-[#f2c9c6]"
      }`}
    >
      {children}
    </p>
  );
}

/**
 * Bloc annonçant une fonctionnalité à venir.
 *
 * Sert à tenir l'exigence §77 : aucune donnée fictive n'est affichée dans
 * l'application. Tant qu'un module n'est pas livré, on l'annonce honnêtement
 * plutôt que de le remplir de chiffres inventés.
 */
export function APrevoir({ titre, phase }: { titre: string; phase: string }) {
  return (
    <Carte className="border-dashed">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">{titre}</h3>
        <Badge>{phase}</Badge>
      </div>
      <p className="text-sm text-attenue mt-2">
        Ce module n&apos;est pas encore disponible. Aucune donnée n&apos;est affichée tant
        qu&apos;il n&apos;est pas réellement en service.
      </p>
    </Carte>
  );
}
