import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function creerClientServeur() {
  const magasinCookies = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return magasinCookies.getAll();
        },
        setAll(cookiesAPoser) {
          try {
            for (const { name, value, options } of cookiesAPoser) {
              magasinCookies.set(name, value, options);
            }
          } catch {
            // Appelé depuis un Server Component : ignoré, le middleware
            // se charge du rafraîchissement de session.
          }
        },
      },
    },
  );
}
