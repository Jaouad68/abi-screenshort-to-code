import { scanNews } from "@/lib/server/news";

export const dynamic = "force-dynamic";

/**
 * Veille planifiée (Vercel Cron, chaque matin du lundi au samedi). En journée,
 * la veille est aussi relancée par les visites, au plus toutes les 15 minutes.
 */
export async function GET() {
  const result = await scanNews();
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
