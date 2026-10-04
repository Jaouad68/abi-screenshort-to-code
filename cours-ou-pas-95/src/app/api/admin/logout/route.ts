import { clearAdminSession } from "@/lib/server/security";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearAdminSession();
  return Response.json({ ok: true });
}
