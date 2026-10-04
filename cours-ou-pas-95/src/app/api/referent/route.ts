import { getLycee } from "@/data/lycees";
import { getStore } from "@/lib/server/store";
import {
  clearReferentSession,
  createReferentSession,
  getReferentSession,
  hashReferentCode,
  normalizeReferentCode,
} from "@/lib/server/security";

export const dynamic = "force-dynamic";

/** GET /api/referent : session référent en cours. */
export async function GET() {
  const s = await getReferentSession();
  if (!s) return Response.json({ referent: null });
  const lycee = getLycee(s.uai);
  return Response.json({ referent: { uai: s.uai, label: s.label, lycee: lycee?.nom ?? s.uai } });
}

/** POST /api/referent { code } : activer son accès référent. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? normalizeReferentCode(body.code) : "";
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
    return Response.json({ error: "Le code doit faire 8 caractères (ex. ABCD-EFGH)." }, { status: 400 });
  }
  const referent = await getStore().findReferentByCodeHash(hashReferentCode(code));
  if (!referent || referent.revokedAt) {
    await new Promise((r) => setTimeout(r, 800));
    return Response.json({ error: "Code invalide ou désactivé." }, { status: 401 });
  }
  await createReferentSession({ rid: referent.id, uai: referent.uai, label: referent.label });
  return Response.json({ ok: true, uai: referent.uai, lycee: getLycee(referent.uai)?.nom ?? referent.uai });
}

/** DELETE /api/referent : se déconnecter. */
export async function DELETE() {
  await clearReferentSession();
  return Response.json({ ok: true });
}
