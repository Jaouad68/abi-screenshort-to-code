import { after } from "next/server";
import { pressArticles, scanNews } from "@/lib/server/news";

export const dynamic = "force-dynamic";

/** GET /api/press : revue de presse des 7 derniers jours. */
export async function GET() {
  after(() => scanNews().catch((e) => console.error("[news]", e)));
  const articles = await pressArticles();
  return Response.json({ articles, generatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
