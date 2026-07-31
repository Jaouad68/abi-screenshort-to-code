/**
 * Logo de l'entreprise : image téléversée (data URL) si présente, sinon une
 * pastille avec l'initiale du nom. Utilisé dans l'interface et les PDF.
 */
export function Logo({
  logoDataUrl,
  nom,
  size = 36,
}: {
  logoDataUrl: string;
  nom: string;
  size?: number;
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

  const initiale = nom.trim().charAt(0).toUpperCase() || "•";
  return (
    <span
      className="grid place-items-center rounded bg-brand text-white font-bold"
      style={{ height: size, width: size, fontSize: size * 0.5 }}
    >
      {initiale}
    </span>
  );
}
