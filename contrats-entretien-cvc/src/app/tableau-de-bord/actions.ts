"use server";

import { redirect } from "next/navigation";
import { destroySessionCookie } from "@/lib/auth";

export async function deconnecter() {
  await destroySessionCookie();
  redirect("/connexion");
}
