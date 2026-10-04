import type { NextRequest } from "next/server";
import { z } from "zod";
import { getLycee } from "@/data/lycees";
import { getStore } from "@/lib/server/store";
import { generateReferentCode, hashReferentCode, isAdmin, unauthorized } from "@/lib/server/security";

export const dynamic = "force-dynamic";

const Body = z.object({ uai: z.string(), label: z.string().trim().min(2).max(60) });

/** GET /api/admin/referents */
export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  const referents = await getStore().listReferents();
  return Response.json({ referents }, { headers: { "Cache-Control": "no-store" } });
}

/** POST /api/admin/referents { uai, label } → le code n'est renvoyé qu'une seule fois. */
export async function POST(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Indique un lycée et un libellé (ex. « Délégué CVL »)." }, { status: 400 });
  const lycee = getLycee(parsed.data.uai);
  if (!lycee) return Response.json({ error: "Lycée inconnu." }, { status: 404 });

  const code = generateReferentCode();
  const referent = await getStore().createReferent({ uai: lycee.uai, label: parsed.data.label, codeHash: hashReferentCode(code) });
  return Response.json({ referent, code });
}

/** DELETE /api/admin/referents?id=… : révoquer un référent. */
export async function DELETE(request: NextRequest) {
  if (!(await isAdmin())) return unauthorized();
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });
  await getStore().revokeReferent(id);
  return Response.json({ ok: true });
}
