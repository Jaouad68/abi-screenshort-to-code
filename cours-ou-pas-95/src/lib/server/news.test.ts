import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Rejoue le vrai flux enregistré, en datant tous les articles d'il y a une heure. */
function recentFeed(): string {
  const xml = readFileSync(new URL("./__fixtures__/google-news-blocus.xml", import.meta.url), "utf8");
  const recent = new Date(Date.now() - 3_600_000).toUTCString();
  return xml.replace(/<pubDate>[^<]*<\/pubDate>/g, `<pubDate>${recent}</pubDate>`);
}

describe("scanNews", () => {
  beforeEach(() => {
    vi.resetModules();
    delete (globalThis as { __coursOuPasStore?: unknown }).__coursOuPasStore;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });
  afterEach(() => vi.unstubAllGlobals());

  it("enregistre les articles récents liés à un lycée, sans doublon, et respecte l'intervalle", async () => {
    const fetchMock = vi.fn(async () => new Response(recentFeed(), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { scanNews, recentMentionsByLycee } = await import("./news");

    const first = await scanNews();
    expect(first.skipped).toBe(false);
    expect(first.errors).toEqual([]);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(2);
    // Le même flux est renvoyé pour chaque requête : les doublons sont fusionnés.
    expect(first.mentions).toBe(10);

    const byLycee = await recentMentionsByLycee();
    expect(byLycee["0950641F"]?.[0].title).toContain("Jean-Jaurès");
    expect(byLycee["0952173W"]?.[0].source).toBe("Actu.fr");

    // Une 2e veille dans les 15 minutes est ignorée…
    expect((await scanNews()).skipped).toBe(true);
    // …sauf si elle est forcée par l'admin.
    expect((await scanNews({ force: true })).skipped).toBe(false);
  });

  it("ignore les articles trop anciens et survit à une source en panne", async () => {
    const old = readFileSync(new URL("./__fixtures__/google-news-blocus.xml", import.meta.url), "utf8").replace(
      /<pubDate>[^<]*<\/pubDate>/g,
      "<pubDate>Mon, 01 Jan 2024 10:00:00 GMT</pubDate>",
    );
    let n = 0;
    vi.stubGlobal("fetch", vi.fn(async () => (n++ === 0 ? new Response("", { status: 503 }) : new Response(old))));
    const { scanNews } = await import("./news");
    const r = await scanNews();
    expect(r.mentions).toBe(0);
    expect(r.errors).toHaveLength(1);
  });
});
