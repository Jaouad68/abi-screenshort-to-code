import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

type ContexteValeur = { session: Session | null; chargee: boolean };

const Contexte = createContext<ContexteValeur>({ session: null, chargee: false });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [chargee, setChargee] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setChargee(true));
    const { data } = supabase.auth.onAuthStateChange((_event, nouvelle) => setSession(nouvelle));
    return () => data.subscription.unsubscribe();
  }, []);

  return <Contexte.Provider value={{ session, chargee }}>{children}</Contexte.Provider>;
}

export function useSession(): ContexteValeur {
  return useContext(Contexte);
}
