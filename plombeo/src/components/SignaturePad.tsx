"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Bouton, Carte, Champ, Message } from "@/components/ui";
import { signerIntervention, type EtatDocument } from "@/app/app/documents/actions";

const etatInitial: EtatDocument = {};

/** Résolution interne du tracé. Fixe : le rendu s'adapte, pas les données. */
const LARGEUR = 900;
const HAUTEUR = 300;

/**
 * Signature manuscrite capturée sur l'appareil.
 *
 * Ce que ce composant produit est une signature **simple**, et il le dit à
 * l'artisan en toutes lettres : la Phase 0 a laissé ouverte la décision n°4
 * (niveau de signature), et laisser croire à une signature avancée serait
 * exactement la fausse garantie que le §76 interdit.
 *
 * Le tracé part en `data:image/png;base64,…`. L'empreinte du contenu signé,
 * elle, est calculée SERVEUR à partir de la base : voir `signerIntervention`.
 */
export function SignaturePad({
  interventionId,
  resume,
}: {
  interventionId: string;
  /** Ce que le client s'apprête à signer, affiché avant signature. */
  resume: string;
}) {
  const [etat, envoyer, enCours] = useActionState(signerIntervention, etatInitial);
  const [ouvert, setOuvert] = useState(false);
  const [trace, setTrace] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const dessine = useRef(false);
  const cle = etat.tentative ?? 0;

  // Le canevas est vidé à chaque (re)montage du formulaire : React 19 réinitialise
  // le formulaire après l'action, le tracé doit suivre.
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, LARGEUR, HAUTEUR);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1c1c1c";
  }, [ouvert, cle]);

  function point(evenement: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvas.current;
    if (!c) return { x: 0, y: 0 };
    const cadre = c.getBoundingClientRect();
    // Le canevas est étiré par CSS : on ramène le pointeur dans le repère interne.
    return {
      x: ((evenement.clientX - cadre.left) / cadre.width) * LARGEUR,
      y: ((evenement.clientY - cadre.top) / cadre.height) * HAUTEUR,
    };
  }

  function commencer(evenement: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    evenement.currentTarget.setPointerCapture(evenement.pointerId);
    dessine.current = true;
    const p = point(evenement);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function continuer(evenement: React.PointerEvent<HTMLCanvasElement>) {
    if (!dessine.current) return;
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const p = point(evenement);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function terminer() {
    if (!dessine.current) return;
    dessine.current = false;
    const c = canvas.current;
    if (c) setTrace(c.toDataURL("image/png"));
  }

  function effacer() {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, LARGEUR, HAUTEUR);
    setTrace("");
  }

  if (!ouvert) {
    return (
      <Carte>
        <h2 className="font-semibold mb-1">Faire signer le bon d&apos;intervention</h2>
        <p className="text-sm text-attenue mb-3">
          Le client signe sur votre écran. Sa signature est enregistrée avec la date,
          l&apos;heure et une empreinte du texte signé.
        </p>
        {etat.succes && <Message ton="succes">{etat.succes}</Message>}
        <Bouton type="button" variante="discret" onClick={() => setOuvert(true)}>
          Faire signer
        </Bouton>
      </Carte>
    );
  }

  return (
    <Carte>
      <h2 className="font-semibold mb-3">Faire signer le bon d&apos;intervention</h2>

      {/* Hors du formulaire : celui-ci est remonté après l'action, le message
          partirait avec lui. */}
      {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
      {etat.succes && <Message ton="succes">{etat.succes}</Message>}

      <div className="mt-3">
        <h3 className="font-semibold text-sm mb-1">Ce qui est signé</h3>
        <pre className="text-sm whitespace-pre-wrap bg-fond border border-trait rounded-controle p-3 font-sans">
          {resume}
        </pre>
      </div>

      <form key={cle} action={envoyer} className="flex flex-col gap-4 mt-4" noValidate>
        <input type="hidden" name="interventionId" value={interventionId} />
        <input type="hidden" name="trace" value={trace} />

        <Champ
          id="signataireNom"
          name="signataireNom"
          libelle="Nom du signataire"
          aide="La personne qui signe, telle qu'elle se nomme."
          autoComplete="off"
        />

        <div className="flex flex-col gap-1.5">
          <span className="font-semibold text-sm">Signature</span>
          <canvas
            ref={canvas}
            width={LARGEUR}
            height={HAUTEUR}
            aria-label="Zone de signature"
            onPointerDown={commencer}
            onPointerMove={continuer}
            onPointerUp={terminer}
            onPointerCancel={terminer}
            // `touch-none` : sans cela, le doigt fait défiler la page au lieu de tracer.
            className="touch-none w-full h-40 bg-white border border-trait rounded-controle cursor-crosshair"
          />
          <div className="flex justify-between items-center gap-3">
            <p className="text-sm text-attenue">
              {trace ? "Signature saisie." : "Signez dans le cadre avec le doigt ou le stylet."}
            </p>
            <Bouton type="button" variante="discret" onClick={effacer}>
              Effacer
            </Bouton>
          </div>
        </div>

        {/* Exigence de la spécification : dire ce que vaut cette signature, et ce
            qu'elle ne vaut pas. */}
        <div className="text-sm bg-fond border border-trait rounded-controle p-3">
          <p className="font-semibold">Portée de cette signature</p>
          <p className="mt-1">
            Il s&apos;agit d&apos;une <strong>signature simple</strong>. Plombéo enregistre le
            tracé, le nom saisi, la date et l&apos;heure du serveur, l&apos;appareil utilisé et
            une empreinte du texte ci-dessus, qui permet de démontrer qu&apos;il n&apos;a pas
            changé depuis.
          </p>
          <p className="mt-2">
            Plombéo ne qualifie pas juridiquement cette signature et ne garantit pas
            qu&apos;elle suffise pour un engagement donné. Une signature{" "}
            {/* Espace explicite : JSX supprime celle qui suit une balise en fin de
                ligne, et le texte se lisait « qualifiée— celle ». */}
            <strong>avancée ou qualifiée</strong>{" "}
            — celle qu&apos;on attend d&apos;un engagement important — passe par un
            prestataire spécialisé. En cas de doute, demandez à votre conseil.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Bouton type="submit" disabled={enCours || !trace}>
            {enCours ? "Enregistrement…" : "Enregistrer la signature"}
          </Bouton>
          <Bouton type="button" variante="discret" onClick={() => setOuvert(false)}>
            Fermer
          </Bouton>
        </div>
      </form>
    </Carte>
  );
}
