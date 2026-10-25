import { useState } from 'react';
import { View } from 'react-native';

import { Bouton, Carte, Choix, Ecran, Texte } from '@/components/ui';
import { Couleurs, Espace, TAILLES_TEXTE, type TailleTexte } from '@/constants/theme';
import { usePreferences } from '@/providers/preferences';

const LIBELLES_TAILLE: Record<TailleTexte, string> = {
  1: 'Normal',
  1.25: 'Grand',
  1.5: 'Très grand',
  2: 'Énorme',
};

/**
 * E01. Ordre choisi : la taille du texte d'abord, pour que les écrans suivants soient lisibles,
 * puis la promesse, puis l'avertissement de non-affiliation qui termine l'onboarding (US01).
 */
export default function Onboarding() {
  const { tailleTexte, lectureVocale, modifier } = usePreferences();
  const [etape, setEtape] = useState(0);

  const pied = (
    <>
      {etape === 2 ? (
        <Bouton
          libelle="J’ai compris"
          onPress={() => modifier({ avertissementAccepteLe: new Date().toISOString() })}
        />
      ) : (
        <Bouton libelle="Continuer" onPress={() => setEtape(etape + 1)} />
      )}
      {etape > 0 ? <Bouton variante="lien" libelle="Revenir" onPress={() => setEtape(etape - 1)} /> : null}
      <Texte variante="petit" couleur={Couleurs.texteSecondaire} style={{ textAlign: 'center' }}>
        Étape {etape + 1} sur 3
      </Texte>
    </>
  );

  return (
    <Ecran bas={pied}>
      <View style={{ height: Espace.xl }} />
      {etape === 0 ? (
        <>
          <Texte variante="titre">Bienvenue</Texte>
          <Texte>Choisissez la taille du texte qui vous convient. Vous pourrez la changer plus tard.</Texte>
          <View style={{ gap: Espace.s }} accessibilityRole="radiogroup">
            {TAILLES_TEXTE.map((t) => (
              <Choix
                key={t}
                libelle={`${LIBELLES_TAILLE[t]} (${t * 100} %)`}
                choisi={tailleTexte === t}
                onPress={() => modifier({ tailleTexte: t })}
              />
            ))}
          </View>
          <Choix
            libelle="Lire les écrans à voix haute"
            choisi={lectureVocale}
            onPress={() => modifier({ lectureVocale: !lectureVocale })}
          />
        </>
      ) : null}

      {etape === 1 ? (
        <>
          <Texte variante="titre">Vos démarches, expliquées simplement</Texte>
          <Texte>Nous vous disons quoi faire, avec quels papiers et avant quelle date.</Texte>
          <Texte>Vous faites ensuite la démarche vous-même, sur le site officiel, en étant guidé pas à pas.</Texte>
          <Texte>Nous ne vous demanderons jamais vos mots de passe.</Texte>
        </>
      ) : null}

      {etape === 2 ? (
        <>
          <Texte variante="titre">Important</Texte>
          <Carte ton="avertissement">
            <Texte variante="corpsGras" couleur={Couleurs.avertissementTexte}>
              Cette application est un service privé. Elle n’est pas affiliée à l’administration.
            </Texte>
            <Texte couleur={Couleurs.avertissementTexte}>
              Les démarches restent à faire sur les sites officiels. Quand une démarche est gratuite, nous vous le
              disons toujours.
            </Texte>
          </Carte>
        </>
      ) : null}
    </Ecran>
  );
}
