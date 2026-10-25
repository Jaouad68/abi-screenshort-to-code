import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import type { TailleTexte } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session';

type Preferences = {
  tailleTexte: TailleTexte;
  lectureVocale: boolean;
  avertissementAccepteLe: string | null;
};

type ContexteValeur = Preferences & {
  chargees: boolean;
  modifier: (patch: Partial<Preferences>) => void;
};

const CLE = 'preferences.v1';
const DEFAUT: Preferences = { tailleTexte: 1, lectureVocale: false, avertissementAccepteLe: null };

const Contexte = createContext<ContexteValeur | null>(null);

/**
 * Préférences d'affichage. Gardées sur l'appareil (elles servent avant la connexion)
 * et recopiées dans `profiles` dès qu'une session existe.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [prefs, setPrefs] = useState<Preferences>(DEFAUT);
  const [chargees, setChargees] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CLE)
      .then((brut) => brut && setPrefs({ ...DEFAUT, ...JSON.parse(brut) }))
      .catch(() => {})
      .finally(() => setChargees(true));
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!chargees || !userId || !supabase) return;
    supabase
      .from('profiles')
      .update({
        text_scale: prefs.tailleTexte,
        voice_enabled: prefs.lectureVocale,
        disclaimer_accepted_at: prefs.avertissementAccepteLe,
      })
      .eq('id', userId)
      .then(({ error }) => {
        if (error) console.warn('Synchronisation du profil impossible', error.message);
      });
  }, [chargees, userId, prefs]);

  const modifier = (patch: Partial<Preferences>) => {
    setPrefs((courantes) => {
      const suivantes = { ...courantes, ...patch };
      AsyncStorage.setItem(CLE, JSON.stringify(suivantes)).catch(() => {});
      return suivantes;
    });
  };

  return <Contexte.Provider value={{ ...prefs, chargees, modifier }}>{children}</Contexte.Provider>;
}

export function usePreferences(): ContexteValeur {
  const valeur = useContext(Contexte);
  if (!valeur) throw new Error('usePreferences hors de PreferencesProvider');
  return valeur;
}
