import { View } from 'react-native';

import { Bouton, Choix, Ecran, Texte } from '@/components/ui';
import { Espace, TAILLES_TEXTE } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { usePreferences } from '@/providers/preferences';
import { useSession } from '@/providers/session';

/** Partie « affichage » de E17 (le reste des réglages arrive avec le coffre et l'abonnement). */
export default function Reglages() {
  const { tailleTexte, lectureVocale, modifier } = usePreferences();
  const { session } = useSession();

  return (
    <Ecran>
      <Texte variante="sousTitre" accessibilityRole="header">
        Taille du texte
      </Texte>
      <View style={{ gap: Espace.s }} accessibilityRole="radiogroup">
        {TAILLES_TEXTE.map((t) => (
          <Choix key={t} libelle={`${t * 100} %`} choisi={tailleTexte === t} onPress={() => modifier({ tailleTexte: t })} />
        ))}
      </View>

      <Texte variante="sousTitre" accessibilityRole="header">
        Lecture à voix haute
      </Texte>
      <Choix
        libelle="Afficher le bouton « Écouter »"
        choisi={lectureVocale}
        onPress={() => modifier({ lectureVocale: !lectureVocale })}
      />

      {session && supabase ? (
        <>
          <Texte variante="sousTitre" accessibilityRole="header">
            Compte
          </Texte>
          <Texte>{session.user.email}</Texte>
          <Bouton variante="secondaire" libelle="Me déconnecter" onPress={() => supabase!.auth.signOut()} />
        </>
      ) : null}
    </Ecran>
  );
}
