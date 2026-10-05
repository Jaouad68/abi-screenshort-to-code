import type { Metadata } from "next";
import Link from "next/link";
import { IconBadge, IconBell, IconChevronRight, IconMapTab, IconMegaphone, IconNews, IconShield, IconStar } from "@/components/icons";
import { StatusIcon } from "@/components/status";
import { CONFIDENCE_META, STATUS_META } from "@/lib/status";

export const metadata: Metadata = { title: "À propos" };

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-32 pt-safe">
      <header className="pt-5">
        <span className="text-[13px] font-semibold uppercase tracking-wide text-label-2">Cours ou Pas ? 95</span>
        <h1 className="mt-1 font-display text-[34px] font-bold leading-tight tracking-tight">À propos</h1>
      </header>

      <section className="mt-5 animate-fade-up rounded-[28px] bg-gradient-to-br from-accent to-accent-2 p-5 text-white shadow-float">
        <p className="font-display text-[22px] font-bold leading-snug">
          Savoir en un coup d&apos;œil s&apos;il y a cours demain, dans ton lycée.
        </p>
        <p className="mt-2 text-[15px] leading-snug opacity-90">
          Une application participative et neutre pour suivre les grèves et blocages dans les lycées du Val d&apos;Oise.
        </p>
      </section>

      <Group title="Comment ça marche">
        <Row icon={<Badge className="bg-accent"><IconMegaphone width={18} height={18} /></Badge>} title="Les élèves, parents et profs signalent">
          Sur la fiche d&apos;un lycée, chacun peut indiquer la situation du jour, de façon anonyme.
        </Row>
        <Row icon={<Badge className="bg-normal"><IconStar width={18} height={18} /></Badge>} title="Le statut se met à jour en direct">
          Les signalements récents comptent davantage. Plus ils sont nombreux et concordants, plus le statut est fiable.
        </Row>
        <Row icon={<Badge className="bg-[#ff9500]"><IconShield width={18} height={18} /></Badge>} title="La modération veille">
          Les faux signalements sont supprimés. Un statut « Vérifié » a été validé par l&apos;équipe de modération.
        </Row>
      </Group>

      <Group title="Fonctionnalités">
        <Row icon={<Badge className="bg-accent-2"><IconMapTab width={18} height={18} /></Badge>} title="La carte">
          Tous les lycées du Val d&apos;Oise sur une carte, colorés selon leur statut du jour.
        </Row>
        <Row icon={<Badge className="bg-[#ff9500]"><IconBell width={18} height={18} /></Badge>} title="Les alertes">
          Sur la fiche d&apos;un lycée, active les alertes : tu es prévenu dès qu&apos;un changement est confirmé. Sur iPhone,
          ajoute d&apos;abord l&apos;app à l&apos;écran d&apos;accueil.
        </Row>
        <Row icon={<Badge className="bg-[#34aadc]"><IconNews width={18} height={18} /></Badge>} title="La veille presse">
          L&apos;app surveille l&apos;actualité en continu et affiche les articles qui citent un lycée du 95 (blocus, grève…).
        </Row>
        <Row icon={<Badge className="bg-accent"><IconBadge width={18} height={18} /></Badge>} title="Les référents vérifiés">
          Des délégués, parents élus ou personnels reçoivent un code de la modération. Leurs signalements fixent le statut de
          leur lycée.
        </Row>
      </Group>

      <Link href="/referent" className="pressable mt-3 flex items-center gap-3 rounded-[22px] bg-card px-4 py-3.5 shadow-card">
        <IconBadge width={20} height={20} className="text-accent" />
        <span className="flex-1 font-semibold">Tu as un code référent ?</span>
        <IconChevronRight width={16} height={16} className="text-label-3" />
      </Link>

      <Group title="Les statuts">
        {(["normal", "perturbe", "bloque", "inconnu"] as const).map((s) => (
          <Row key={s} icon={<StatusIcon status={s} size={32} />} title={STATUS_META[s].label}>
            {STATUS_META[s].description}
          </Row>
        ))}
      </Group>

      <Group title="Niveaux de fiabilité">
        {(Object.keys(CONFIDENCE_META) as (keyof typeof CONFIDENCE_META)[]).map((c) => (
          <Row key={c} title={CONFIDENCE_META[c].label}>
            {CONFIDENCE_META[c].description}
          </Row>
        ))}
      </Group>

      <Group title="Vie privée">
        <Row title="Aucun compte, aucune donnée personnelle">
          Nous ne stockons ni nom, ni e-mail, ni adresse IP. Seule une empreinte anonyme sert à limiter les abus. Tes
          favoris restent sur ton téléphone.
        </Row>
      </Group>

      <Group title="Important">
        <Row title="Information participative">
          Cours ou Pas ? ne prend pas position sur les mouvements. Les informations ne remplacent pas les communications
          officielles de ton établissement (ENT, Pronote) ou du rectorat de Versailles.
        </Row>
        <Row title="Installer l'app sur iPhone">
          Dans Safari, touche le bouton Partager puis « Sur l&apos;écran d&apos;accueil ».
        </Row>
      </Group>

      <p className="mt-8 text-center text-[12px] text-label-3">
        Liste des établissements : Annuaire de l&apos;Éducation nationale (data.education.gouv.fr), Licence Ouverte.
      </p>
    </main>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-1.5 px-4 text-[13px] font-semibold uppercase tracking-wide text-label-2">{title}</h2>
      <ul className="overflow-hidden rounded-[22px] bg-card shadow-card">{children}</ul>
    </section>
  );
}

function Row({ icon, title, children }: { icon?: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 border-b border-separator px-4 py-3.5 last:border-0">
      {icon && <div className="pt-0.5">{icon}</div>}
      <div>
        <div className="text-[16px] font-semibold">{title}</div>
        <div className="mt-0.5 text-[14px] leading-snug text-label-2">{children}</div>
      </div>
    </li>
  );
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`flex h-8 w-8 items-center justify-center rounded-[9px] text-white ${className}`}>{children}</span>;
}
