import Link from "next/link";

export const metadata = {
  title: "Politique de confidentialité — RésaZen",
};

export default function PolitiqueConfidentialitePage() {
  return (
    <main className="flex-1 max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-serif text-3xl mb-8">Politique de confidentialité</h1>

      <div className="flex flex-col gap-8 text-muted">
        <section>
          <h2 className="font-serif text-xl text-ink mb-2">Responsable du traitement</h2>
          <p>
            <strong className="text-ink">Jaouad Khamlach</strong>, éditeur du site RésaZen
            (voir <Link href="/mentions-legales" className="text-sage-d hover:underline">mentions légales</Link>),
            est responsable du traitement des données décrites ci-dessous.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink mb-2">Données collectées</h2>
          <p className="mb-2">
            <strong className="text-ink">Comptes gérant</strong> : e-mail, mot de passe (stocké de façon
            chiffrée, jamais en clair), numéro de mobile optionnel.
          </p>
          <p>
            <strong className="text-ink">Clientes des salons</strong> : prénom, numéro de mobile,
            historique des rendez-vous, consentement à recevoir des SMS.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink mb-2">Finalités</h2>
          <p>
            Ces données sont utilisées uniquement pour : la gestion du compte gérant, la prise et le suivi
            des rendez-vous, l&apos;envoi de SMS/e-mails liés au rendez-vous (confirmation, rappel), et la
            facturation de l&apos;abonnement du salon.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink mb-2">Base légale</h2>
          <p>
            Exécution du contrat (gestion du rendez-vous, de l&apos;abonnement) et consentement explicite pour
            l&apos;envoi de SMS aux clientes des salons.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink mb-2">Destinataires des données</h2>
          <p className="mb-2">Les données ne sont jamais vendues. Elles sont partagées uniquement avec les prestataires techniques nécessaires au fonctionnement du service :</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-ink">Neon</strong> — hébergement de la base de données</li>
            <li><strong className="text-ink">Vercel</strong> — hébergement de l&apos;application</li>
            <li><strong className="text-ink">Stripe</strong> — traitement des paiements (acomptes, abonnements)</li>
            <li><strong className="text-ink">Brevo</strong> — envoi des SMS et e-mails, lorsque cette option est activée par le salon</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink mb-2">Durée de conservation</h2>
          <p>
            Les données sont conservées tant que le compte du salon est actif. Une cliente peut demander
            la suppression de ses données personnelles à tout moment auprès du salon concerné ; ses données
            d&apos;identification sont alors anonymisées, l&apos;historique des rendez-vous étant conservé de
            façon anonyme à des fins comptables et statistiques.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink mb-2">Vos droits</h2>
          <p>
            Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement
            et d&apos;opposition sur vos données personnelles. Pour l&apos;exercer, contactez directement le salon
            auprès duquel vous avez pris rendez-vous, ou écrivez à{" "}
            <strong className="text-ink">jaouad.khamlach.job@gmail.com</strong>.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink mb-2">Cookies</h2>
          <p>
            RésaZen utilise un unique cookie, strictement nécessaire à la connexion à votre compte
            (aucun cookie publicitaire ou de mesure d&apos;audience tiers n&apos;est utilisé).
          </p>
        </section>
      </div>

      <p className="mt-12 text-sm">
        <Link href="/" className="text-sage-d hover:underline">
          ← Retour à l&apos;accueil
        </Link>
      </p>
    </main>
  );
}
