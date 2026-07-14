import Link from "next/link";

export const metadata = {
  title: "Mentions légales — RésaZen",
};

export default function MentionsLegalesPage() {
  return (
    <main className="flex-1 max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-serif text-3xl mb-8">Mentions légales</h1>

      <div className="flex flex-col gap-8 text-muted">
        <section>
          <h2 className="font-serif text-xl text-ink mb-2">Éditeur du site</h2>
          <p>
            Le site RésaZen est édité par <strong className="text-ink">[Nom / raison sociale à compléter]</strong>,
            <br />
            [Statut juridique — ex : entreprise individuelle, SASU… à compléter]
            <br />
            [Adresse à compléter]
            <br />
            [SIRET à compléter, une fois l&apos;activité immatriculée]
            <br />
            Contact : <strong className="text-ink">[adresse e-mail de contact à compléter]</strong>
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink mb-2">Directeur de la publication</h2>
          <p>[Nom du responsable à compléter]</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink mb-2">Hébergement</h2>
          <p>
            Application hébergée par <strong className="text-ink">Vercel Inc.</strong>, 340 S Lemon Ave #4133,
            Walnut, CA 91789, États-Unis.
          </p>
          <p className="mt-2">
            Base de données hébergée par <strong className="text-ink">Neon Inc.</strong> (PostgreSQL).
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink mb-2">Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble des contenus présents sur ce site (textes, éléments graphiques, logo) est protégé
            par le droit d&apos;auteur. Toute reproduction non autorisée est interdite.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink mb-2">Droit applicable</h2>
          <p>Le présent site est soumis au droit français. En cas de litige, les tribunaux français sont seuls compétents.</p>
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
