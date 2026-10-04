import { checkAdminPassword, createAdminSession, isAdminEnabled } from "@/lib/server/security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminEnabled()) {
    return Response.json({ error: "Espace admin désactivé (ADMIN_PASSWORD manquant)." }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  if (!checkAdminPassword(password)) {
    // Petite pause pour ralentir les tentatives en série.
    await new Promise((r) => setTimeout(r, 800));
    return Response.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }
  await createAdminSession();
  return Response.json({ ok: true });
}
