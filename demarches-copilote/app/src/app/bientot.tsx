import { useLocalSearchParams } from 'expo-router';
import { Linking } from 'react-native';

import { BandeauNonOfficiel, Bouton, Ecran, Texte } from '@/components/ui';

const DEMARCHES: Record<string, { titre: string; site?: { nom: string; url: string } }> = {
  retraite: { titre: 'Retraite', site: { nom: 'info-retraite.fr', url: 'https://www.info-retraite.fr' } },
  impots: { titre: 'Impôts', site: { nom: 'impots.gouv.fr', url: 'https://www.impots.gouv.fr' } },
  courrier: { titre: 'Lire un courrier' },
};

/** Démarches prévues au MVP mais pas encore livrées. */
export default function Bientot() {
  const { demarche } = useLocalSearchParams<{ demarche: string }>();
  const d = DEMARCHES[demarche] ?? { titre: 'Cette démarche' };

  return (
    <Ecran bas={d.site ? <Bouton libelle={`Ouvrir ${d.site.nom}`} onPress={() => Linking.openURL(d.site!.url)} /> : null}>
      <BandeauNonOfficiel siteOfficiel={d.site} />
      <Texte variante="titre">{d.titre} arrive bientôt</Texte>
      <Texte>Nous préparons ce parcours avec soin. Il sera disponible dans une prochaine mise à jour.</Texte>
      {d.site ? <Texte>En attendant, vous pouvez consulter le site officiel.</Texte> : null}
    </Ecran>
  );
}
