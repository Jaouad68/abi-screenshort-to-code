import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';

import { BandeauNonOfficiel, Bouton, BoutonEcouter, Carte, Ecran, Separateur, Texte } from '@/components/ui';
import { Couleurs, Espace } from '@/constants/theme';
import { useParcours } from '@/hooks/use-parcours';
import { nomDuSite } from '@/lib/intention';
import { creerDemarche } from '@/lib/demarches';
import { resultat } from '@/lib/parcours/evaluer';
import type { Answers, Procedure } from '@/lib/parcours/types';

function lireReponses(brut: string | undefined): Answers {
  try {
    const valeur = JSON.parse(brut ?? '{}');
    return valeur && typeof valeur === 'object' ? valeur : {};
  } catch {
    return {};
  }
}

/** E05 : « Votre démarche » (US05, RG01). */
export default function Resultat() {
  const params = useLocalSearchParams<{ slug: string; version?: string; reponses?: string }>();
  const etat = useParcours(params.slug, params.version ? Number(params.version) : undefined);

  if (etat.statut === 'chargement') {
    return (
      <Ecran>
        <ActivityIndicator size="large" color={Couleurs.principal} />
      </Ecran>
    );
  }
  if (etat.statut === 'introuvable') {
    return (
      <Ecran>
        <Texte>Cette démarche n’est pas disponible pour le moment.</Texte>
      </Ecran>
    );
  }
  return <Detail parcours={etat.parcours} reponses={lireReponses(params.reponses)} />;
}

function Detail({ parcours, reponses }: { parcours: Procedure; reponses: Answers }) {
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const r = resultat(parcours.content, reponses);
  const site = { nom: nomDuSite(parcours.officialUrl), url: parcours.officialUrl };
  const dateSource = new Date(parcours.sourceUpdatedAt).toLocaleDateString('fr-FR');

  if (r.kind === 'non_couvert') {
    return (
      <Ecran bas={<Bouton libelle={`Ouvrir ${site.nom}`} onPress={() => Linking.openURL(site.url)} />}>
        <BandeauNonOfficiel siteOfficiel={site} />
        <Texte variante="titre">Votre situation est particulière</Texte>
        <Texte>
          Nous ne couvrons pas encore ce cas et préférons ne pas vous donner une information approximative. La fiche
          officielle vous dira exactement quoi faire.
        </Texte>
        <Texte>Vous pouvez aussi vous faire aider gratuitement dans un espace France Services.</Texte>
      </Ecran>
    );
  }

  const commencer = async () => {
    setEnCours(true);
    const res = await creerDemarche(parcours.slug, parcours.version, reponses, r.etapes[0]?.key);
    setEnCours(false);
    if (res.ok) router.dismissTo('/');
    else setMessage(res.message);
  };

  const texteLu = [
    `Coût : ${r.cout}.`,
    r.gratuit ? `Cette démarche est gratuite sur ${site.nom}.` : '',
    `Les étapes : ${r.etapes.map((e) => e.label).join('. ')}.`,
    `Les papiers à préparer : ${r.pieces.map((p) => p.label).join('. ')}.`,
  ].join(' ');

  return (
    <Ecran
      bas={
        <>
          {message ? (
            <Carte ton="avertissement">
              <Texte couleur={Couleurs.avertissementTexte}>{message}</Texte>
            </Carte>
          ) : null}
          <Bouton libelle="Commencer cette démarche" onPress={commencer} desactive={enCours} />
          <Bouton variante="lien" libelle={`Voir sur ${site.nom}`} onPress={() => Linking.openURL(site.url)} />
        </>
      }>
      <BandeauNonOfficiel siteOfficiel={site} />
      <Texte variante="titre">{parcours.title}</Texte>

      <Carte>
        <Texte variante="petit" couleur={Couleurs.texteSecondaire}>
          Coût officiel
        </Texte>
        <Texte variante="sousTitre" couleur={Couleurs.principal}>
          {r.cout}
        </Texte>
        {r.gratuit ? <Texte variante="corpsGras">Cette démarche est gratuite sur {site.nom}.</Texte> : null}
        <Texte variante="petit" couleur={Couleurs.texteSecondaire}>
          Délai habituel de réponse : environ {r.outcome.delai_reponse_jours} jours.
        </Texte>
      </Carte>

      <BoutonEcouter texte={texteLu} />

      <View style={{ gap: Espace.m }}>
        <Texte variante="sousTitre" accessibilityRole="header">
          Les étapes
        </Texte>
        {r.etapes.map((e, i) => (
          <View key={e.key} style={{ gap: Espace.xs }}>
            <Texte variante="corpsGras">
              {i + 1}. {e.label}
            </Texte>
            <Texte couleur={Couleurs.texteSecondaire}>{e.aide}</Texte>
          </View>
        ))}
      </View>

      <Separateur />

      <View style={{ gap: Espace.m }}>
        <Texte variante="sousTitre" accessibilityRole="header">
          Les papiers à préparer
        </Texte>
        {r.pieces.map((p) => (
          <View key={p.key} style={{ gap: Espace.xs }}>
            <Texte variante="corpsGras">• {p.label}</Texte>
            <Texte couleur={Couleurs.texteSecondaire}>{p.aide}</Texte>
          </View>
        ))}
      </View>

      <Texte variante="petit" couleur={Couleurs.texteSecondaire}>
        Source : fiche officielle mise à jour le {dateSource}.
      </Texte>
    </Ecran>
  );
}
