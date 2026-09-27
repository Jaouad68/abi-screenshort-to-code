/**
 * Logo de l'entreprise : image téléversée dans les Réglages (data URL) si
 * présente, sinon le logo Francisco MELLADO livré avec l'application
 * (public/marque). Utilisé dans l'interface et les PDF.
 *
 * - « marque » : monogramme FM seul, pour les petits formats (barre du haut).
 * - « complet » : logo avec nom, activité et ville (écran de connexion, PDF).
 */
const LOGOS_PAR_DEFAUT = {
  marque: { src: "/marque/logo-fm.png", ratio: 671 / 421 },
  complet: { src: "/marque/logo-mellado.png", ratio: 1736 / 421 },
} as const;

export function Logo({
  logoDataUrl,
  nom,
  size = 36,
  variante = "marque",
}: {
  logoDataUrl: string;
  nom: string;
  size?: number;
  variante?: keyof typeof LOGOS_PAR_DEFAUT;
}) {
  if (logoDataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoDataUrl}
        alt={nom}
        className="object-contain"
        style={{ height: size, width: "auto", maxWidth: size * 3 }}
      />
    );
  }

  const { src, ratio } = LOGOS_PAR_DEFAUT[variante];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={nom}
      width={Math.round(size * ratio)}
      height={size}
      className="block max-w-full object-contain"
      style={{ height: size, width: "auto" }}
    />
  );
}
