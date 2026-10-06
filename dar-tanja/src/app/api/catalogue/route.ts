import { chargerCatalogue } from "@/lib/server/catalogue";

export async function GET() {
  try {
    return Response.json(await chargerCatalogue(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ erreur: (e as Error).message }, { status: 502 });
  }
}
