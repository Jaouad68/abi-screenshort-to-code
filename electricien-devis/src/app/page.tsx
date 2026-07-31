import { redirect } from "next/navigation";
import { getSession, compteExiste } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/tableau-de-bord");
  // Premier lancement : aucun compte → on propose la création du compte.
  if (!(await compteExiste())) redirect("/inscription");
  redirect("/connexion");
}
