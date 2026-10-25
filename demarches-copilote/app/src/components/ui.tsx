import * as Speech from 'expo-speech';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CIBLE_MIN, Couleurs, Espace, Typo, type VarianteTexte } from '@/constants/theme';
import { usePreferences } from '@/providers/preferences';

/** Espaces insécables de la typographie française : « ? » ou « : » ne partent jamais seuls à la ligne. */
function typographie(enfant: ReactNode): ReactNode {
  if (typeof enfant === 'string') return enfant.replace(/ ([?!:;»%€])/g, ' $1').replace(/« /g, '« ');
  if (Array.isArray(enfant)) return enfant.map(typographie);
  return enfant;
}

/** Texte dont la taille suit le réglage de l'usager (US03), en plus du réglage système. */
export function Texte({
  variante = 'corps',
  couleur = Couleurs.texte,
  style,
  children,
  ...rest
}: TextProps & { variante?: VarianteTexte; couleur?: string }) {
  const { tailleTexte } = usePreferences();
  const base = Typo[variante];
  // Les titres sont déjà grands : ils grossissent deux fois moins vite pour ne pas couper les mots.
  const facteur = variante === 'titre' || variante === 'sousTitre' ? 1 + (tailleTexte - 1) / 2 : tailleTexte;
  return (
    <Text
      style={[
        { ...base, color: couleur, fontSize: base.fontSize * facteur, lineHeight: base.lineHeight * facteur },
        style,
      ]}
      {...rest}>
      {typographie(children)}
    </Text>
  );
}

export function Ecran({ children, bas }: { children: ReactNode; bas?: ReactNode }) {
  return (
    <SafeAreaView style={styles.ecran} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {bas ? <View style={styles.bas}>{bas}</View> : null}
    </SafeAreaView>
  );
}

type BoutonProps = {
  libelle: string;
  onPress: () => void;
  variante?: 'principal' | 'secondaire' | 'lien';
  desactive?: boolean;
  aide?: string;
};

export function Bouton({ libelle, onPress, variante = 'principal', desactive, aide }: BoutonProps) {
  const principal = variante === 'principal';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={libelle}
      accessibilityHint={aide}
      accessibilityState={{ disabled: !!desactive }}
      disabled={desactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.bouton,
        principal && styles.boutonPrincipal,
        variante === 'secondaire' && styles.boutonSecondaire,
        variante === 'lien' && styles.boutonLien,
        pressed && principal && { backgroundColor: Couleurs.principalAppuye },
        pressed && !principal && { backgroundColor: Couleurs.principalLeger },
        desactive && { opacity: 0.5 },
      ]}>
      <Texte variante="corpsGras" couleur={principal ? Couleurs.surPrincipal : Couleurs.principal} style={styles.centre}>
        {libelle}
      </Texte>
    </Pressable>
  );
}

/** Grande réponse sélectionnable (écran de diagnostic E04). */
export function Choix({ libelle, choisi, onPress }: { libelle: string; choisi: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: choisi }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choix,
        choisi && styles.choixChoisi,
        pressed && { backgroundColor: Couleurs.principalLeger },
      ]}>
      <View style={[styles.pastille, choisi && styles.pastilleChoisie]} />
      <Texte variante="corpsGras" style={styles.flex}>
        {libelle}
      </Texte>
    </Pressable>
  );
}

/** Tuile de l'accueil (E03). */
export function Tuile({ titre, detail, onPress }: { titre: string; detail: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${titre}. ${detail}`}
      onPress={onPress}
      style={({ pressed }) => [styles.tuile, pressed && { backgroundColor: Couleurs.principalLeger }]}>
      <Texte variante="sousTitre" couleur={Couleurs.principal}>
        {titre}
      </Texte>
      <Texte variante="petit" couleur={Couleurs.texteSecondaire}>
        {detail}
      </Texte>
    </Pressable>
  );
}

export function Champ(props: TextInputProps & { libelle: string }) {
  const { tailleTexte } = usePreferences();
  const { libelle, style, ...rest } = props;
  return (
    <View style={{ gap: Espace.s }}>
      <Texte variante="corpsGras">{libelle}</Texte>
      <TextInput
        accessibilityLabel={libelle}
        placeholderTextColor={Couleurs.texteSecondaire}
        style={[styles.champ, { fontSize: Typo.corps.fontSize * tailleTexte }, style]}
        {...rest}
      />
    </View>
  );
}

export function Carte({ children, ton = 'neutre' }: { children: ReactNode; ton?: 'neutre' | 'avertissement' | 'erreur' }) {
  return (
    <View
      style={[
        styles.carte,
        ton === 'avertissement' && { backgroundColor: Couleurs.avertissementFond, borderColor: Couleurs.avertissementFond },
        ton === 'erreur' && { backgroundColor: Couleurs.erreurFond, borderColor: Couleurs.erreur },
      ]}>
      {children}
    </View>
  );
}

/** RG01 : rappel permanent que l'appli n'est pas un service de l'État, avec le lien officiel. */
export function BandeauNonOfficiel({ siteOfficiel }: { siteOfficiel?: { nom: string; url: string } }) {
  return (
    <View style={styles.bandeau} accessibilityRole="summary">
      <Texte variante="petit" couleur={Couleurs.avertissementTexte}>
        Service privé, non affilié à l’administration.
      </Texte>
      {siteOfficiel ? (
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(siteOfficiel.url)} hitSlop={12}>
          <Texte variante="petit" couleur={Couleurs.avertissementTexte} style={styles.souligne}>
            Site officiel : {siteOfficiel.nom}
          </Texte>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Lecture vocale du contenu principal de l'écran (US03), visible si l'usager l'a activée. */
export function BoutonEcouter({ texte }: { texte: string }) {
  const { lectureVocale } = usePreferences();
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  if (!lectureVocale) return null;

  const basculer = () => {
    if (enCours) {
      Speech.stop();
      setEnCours(false);
      return;
    }
    setEnCours(true);
    Speech.speak(texte, {
      language: 'fr-FR',
      rate: 0.9,
      onDone: () => setEnCours(false),
      onStopped: () => setEnCours(false),
      onError: () => setEnCours(false),
    });
  };

  return <Bouton variante="secondaire" libelle={enCours ? '■  Arrêter la lecture' : '🔊  Écouter'} onPress={basculer} />;
}

export function Separateur() {
  return <View style={styles.separateur} />;
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: Couleurs.fond },
  contenu: { padding: Espace.l, gap: Espace.l, paddingBottom: Espace.xl },
  bas: {
    paddingHorizontal: Espace.l,
    paddingTop: Espace.m,
    paddingBottom: Espace.s,
    gap: Espace.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Couleurs.bordure,
    backgroundColor: Couleurs.fond,
  },
  centre: { textAlign: 'center' },
  flex: { flex: 1 },
  souligne: { textDecorationLine: 'underline' },
  bouton: {
    minHeight: CIBLE_MIN,
    borderRadius: 14,
    paddingHorizontal: Espace.l,
    paddingVertical: Espace.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutonPrincipal: { backgroundColor: Couleurs.principal },
  boutonSecondaire: { borderWidth: 2, borderColor: Couleurs.principal, backgroundColor: Couleurs.surface },
  boutonLien: { backgroundColor: 'transparent' },
  choix: {
    minHeight: CIBLE_MIN + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espace.m,
    padding: Espace.m,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Couleurs.bordure,
    backgroundColor: Couleurs.surface,
  },
  choixChoisi: { borderColor: Couleurs.principal, backgroundColor: Couleurs.principalLeger },
  pastille: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Couleurs.texteSecondaire },
  pastilleChoisie: { borderColor: Couleurs.principal, borderWidth: 8 },
  tuile: {
    minHeight: 110,
    padding: Espace.l,
    gap: Espace.xs,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Couleurs.bordure,
    backgroundColor: Couleurs.surface,
  },
  champ: {
    minHeight: CIBLE_MIN,
    borderWidth: 2,
    borderColor: Couleurs.bordure,
    borderRadius: 12,
    paddingHorizontal: Espace.m,
    backgroundColor: Couleurs.surface,
    color: Couleurs.texte,
  },
  carte: {
    padding: Espace.l,
    gap: Espace.s,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Couleurs.bordure,
    backgroundColor: Couleurs.surface,
  },
  bandeau: {
    padding: Espace.m,
    gap: Espace.xs,
    borderRadius: 12,
    backgroundColor: Couleurs.avertissementFond,
  },
  separateur: { height: StyleSheet.hairlineWidth, backgroundColor: Couleurs.bordure },
});
