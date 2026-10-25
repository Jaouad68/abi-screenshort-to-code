import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Couleurs, Typo } from '@/constants/theme';
import { modeDemo } from '@/lib/supabase';
import { PreferencesProvider, usePreferences } from '@/providers/preferences';
import { SessionProvider, useSession } from '@/providers/session';

SplashScreen.preventAutoHideAsync();

function Navigation() {
  const { session, chargee } = useSession();
  const { avertissementAccepteLe, chargees, tailleTexte } = usePreferences();
  const pret = chargee && chargees;

  useEffect(() => {
    if (pret) SplashScreen.hideAsync();
  }, [pret]);

  if (!pret) return null;

  const accepte = avertissementAccepteLe !== null;
  const connecte = session !== null || modeDemo;

  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Retour',
        headerTintColor: Couleurs.principal,
        headerStyle: { backgroundColor: Couleurs.fond },
        headerTitleStyle: { fontSize: Typo.corpsGras.fontSize * Math.min(tailleTexte, 1.5), color: Couleurs.texte },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Couleurs.fond },
      }}>
      {/* US01 : sans avertissement accepté, seul l'onboarding est accessible. */}
      <Stack.Protected guard={!accepte}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={accepte && !connecte}>
        <Stack.Screen name="connexion" options={{ title: 'Connexion' }} />
      </Stack.Protected>
      <Stack.Protected guard={accepte && connecte}>
        <Stack.Screen name="index" options={{ title: 'Accueil' }} />
        <Stack.Screen name="demarche/[slug]/index" options={{ title: 'Quelques questions' }} />
        <Stack.Screen name="demarche/[slug]/resultat" options={{ title: 'Votre démarche' }} />
        <Stack.Screen name="bientot" options={{ title: 'Bientôt disponible' }} />
        <Stack.Screen name="reglages" options={{ title: 'Réglages' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <PreferencesProvider>
        <StatusBar style="dark" />
        <Navigation />
      </PreferencesProvider>
    </SessionProvider>
  );
}
