import { useEffect, useState } from 'react';

import { chargerParcours } from '@/lib/catalogue';
import type { Procedure } from '@/lib/parcours/types';

type Etat = { statut: 'chargement' } | { statut: 'introuvable' } | { statut: 'pret'; parcours: Procedure };

export function useParcours(slug: string | undefined, version?: number): Etat {
  const cle = `${slug}@${version ?? 'derniere'}`;
  const [charge, setCharge] = useState<{ cle: string; parcours: Procedure | null } | null>(null);

  useEffect(() => {
    if (!slug) return;
    let actif = true;
    chargerParcours(slug, version)
      .catch(() => null)
      .then((parcours) => actif && setCharge({ cle, parcours }));
    return () => {
      actif = false;
    };
  }, [cle, slug, version]);

  if (!slug) return { statut: 'introuvable' };
  if (!charge || charge.cle !== cle) return { statut: 'chargement' };
  return charge.parcours ? { statut: 'pret', parcours: charge.parcours } : { statut: 'introuvable' };
}
