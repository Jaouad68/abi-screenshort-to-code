import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { BandeauNonOfficiel, Bouton, Carte, Champ, Ecran, Texte, Tuile } from '@/components/ui';
import { Couleurs, Espace } from '@/constants/theme';
import { listerDemarchesEnCours, type DemarcheEnCours } from '@/lib/demarches';
import { matchDemarches, type DemarcheId } from '@/lib/intention';
import { modeDemo } from '@/lib/supabase';

const TUILES: { id: DemarcheId; titre: string; detail: string }[] = [
  { id: 'cni-passeport', titre: 'Carte d’identité / passeport', detail: 'Faire, renouveler, perte ou vol' },
  { id: 'retraite', titre: 'Retraite', detail: 'Demander sa retraite, pension de réversion' },
  { id: 'impots', titre: 'Impôts', detail: 'Préparer sa déclaration de revenus' },
  { id: 'courrier', titre: 'Lire un courrier', detail: 'Photographiez-le, on vous l’explique' },
];

const TITRES: Record<string, string> = { 'cni-passeport': 'Carte d’identité / passeport' };

const DISPONIBLES = new Set<DemarcheId>(['cni-passeport']);

function ouvrir(id: DemarcheId) {
  if (DISPONIBLES.has(id)) router.push({ pathname: '/demarche/[slug]', params: { slug: id } });
  else router.push({ pathname: '/bientot', params: { demarche: id } });
}

/** E03 : accueil. */
export default function Accueil() {
  const [enCours, setEnCours] = useState<DemarcheEnCours[]>([]);
  const [recherche, setRecherche] = useState('');
  const [introuvable, setIntrouvable] = useState(false);

  useFocusEffect(
    useCallback(() => {
      listerDemarchesEnCours()
        .then(setEnCours)
        .catch(() => setEnCours([]));
    }, []),
  );

  const chercher = () => {
    const [meilleure] = matchDemarches(recherche);
    setIntrouvable(!meilleure);
    if (meilleure) {
      setRecherche('');
      ouvrir(meilleure);
    }
  };

  return (
    <Ecran>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/reglages')}
              hitSlop={16}
              style={{ paddingHorizontal: Espace.s }}>
              <Texte variante="corpsGras" couleur={Couleurs.principal} style={{ fontSize: 18 }}>
                Réglages
              </Texte>
            </Pressable>
          ),
        }}
      />
      {modeDemo ? (
        <Carte ton="avertissement">
          <Texte variante="petit" couleur={Couleurs.avertissementTexte}>
            Mode démonstration : aucun compte, rien n’est enregistré.
          </Texte>
        </Carte>
      ) : null}

      {enCours.length > 0 ? (
        <View style={{ gap: Espace.s }}>
          <Texte variante="sousTitre">Vos démarches en cours</Texte>
          {enCours.map((d) => (
            <Carte key={d.id}>
              <Texte variante="corpsGras">{TITRES[d.procedure_slug] ?? d.procedure_slug}</Texte>
              <Texte variante="petit" couleur={Couleurs.texteSecondaire}>
                Commencée le {new Date(d.created_at).toLocaleDateString('fr-FR')}
              </Texte>
            </Carte>
          ))}
        </View>
      ) : (
        <Texte variante="titre">Par quoi commençons-nous ?</Texte>
      )}

      <View style={{ gap: Espace.m }}>
        {TUILES.map((t) => (
          <Tuile key={t.id} titre={t.titre} detail={t.detail} onPress={() => ouvrir(t.id)} />
        ))}
      </View>

      <View style={{ gap: Espace.s }}>
        <Champ
          libelle="Ou dites-nous ce que vous voulez faire"
          placeholder="Ex. : refaire ma carte d’identité"
          value={recherche}
          onChangeText={(t) => {
            setRecherche(t);
            setIntrouvable(false);
          }}
          onSubmitEditing={chercher}
          returnKeyType="search"
        />
        <Texte variante="petit" couleur={Couleurs.texteSecondaire}>
          Astuce : appuyez sur le micro de votre clavier pour parler au lieu d’écrire.
        </Texte>
        <Bouton variante="secondaire" libelle="Chercher" onPress={chercher} desactive={!recherche.trim()} />
        {introuvable ? (
          <Texte couleur={Couleurs.erreur}>
            Nous n’avons pas trouvé cette démarche. Essayez avec d’autres mots, ou choisissez une tuile ci-dessus.
          </Texte>
        ) : null}
      </View>

      <BandeauNonOfficiel />
    </Ecran>
  );
}
