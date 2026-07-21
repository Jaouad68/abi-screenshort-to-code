/**
 * Vérifie que la sécurité au niveau ligne (RLS) isole strictement les
 * établissements : un utilisateur d'un établissement ne doit jamais voir
 * les données d'un autre établissement.
 *
 * Applique le vrai fichier de migration (`supabase/migrations/0001_init.sql`)
 * sur une base Postgres locale jetable, plus un stub minimal du schéma
 * `auth` (voir `stub-auth-local.sql`) pour simuler `auth.uid()` sans
 * dépendre de Docker/Supabase CLI. Le rôle `authenticated` utilisé ici
 * n'a ni statut superutilisateur ni BYPASSRLS : les policies s'appliquent
 * donc réellement, comme elles le feraient sur un vrai projet Supabase.
 *
 * Nécessite un serveur PostgreSQL local accessible (rôle "postgres",
 * mot de passe "postgres", 127.0.0.1:5432). Si indisponible, la suite
 * est ignorée avec un message explicite plutôt que de faire échouer
 * `npm test` dans un environnement qui n'a pas Postgres.
 */
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const CONNEXION_ADMIN = {
  host: "127.0.0.1",
  port: 5432,
  user: "postgres",
  password: "postgres",
  database: "postgres",
};

const NOM_BASE_TEST = "margezen_rls_test";

async function postgresDisponible(): Promise<boolean> {
  const client = new Client(CONNEXION_ADMIN);
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

const disponible = await postgresDisponible();

describe.runIf(disponible)("RLS — isolation multi-tenant", () => {
  let admin: Client;

  const etablissementA = randomUUID();
  const etablissementB = randomUUID();
  const utilisateurA = randomUUID();
  const utilisateurB = randomUUID();
  let ingredientA: string;

  beforeAll(async () => {
    const bootstrap = new Client(CONNEXION_ADMIN);
    await bootstrap.connect();
    await bootstrap.query(`drop database if exists ${NOM_BASE_TEST}`);
    await bootstrap.query(`create database ${NOM_BASE_TEST}`);
    await bootstrap.end();

    admin = new Client({ ...CONNEXION_ADMIN, database: NOM_BASE_TEST });
    await admin.connect();

    const stub = fs.readFileSync(
      path.join(__dirname, "stub-auth-local.sql"),
      "utf-8",
    );
    await admin.query(stub);

    const dossierMigrations = path.join(__dirname, "../../supabase/migrations");
    const fichiersMigrations = fs
      .readdirSync(dossierMigrations)
      .filter((nom) => nom.endsWith(".sql"))
      .sort();

    for (const nomFichier of fichiersMigrations) {
      const migration = fs.readFileSync(
        path.join(dossierMigrations, nomFichier),
        "utf-8",
      );
      await admin.query(migration);
    }

    await admin.query(
      `grant usage on schema public to authenticated;
       grant select, insert, update, delete on all tables in schema public to authenticated;
       grant execute on all functions in schema public to authenticated;`,
    );

    await admin.query("insert into auth.users (id) values ($1), ($2)", [
      utilisateurA,
      utilisateurB,
    ]);
    await admin.query(
      "insert into etablissement (id, nom, type_cuisine) values ($1, 'Restaurant A', 'traditionnel'), ($2, 'Restaurant B', 'traditionnel')",
      [etablissementA, etablissementB],
    );
    await admin.query(
      "insert into utilisateur_etablissement (user_id, etablissement_id, role) values ($1, $2, 'proprietaire'), ($3, $4, 'proprietaire')",
      [utilisateurA, etablissementA, utilisateurB, etablissementB],
    );

    const resultat = await admin.query<{ id: string }>(
      `insert into ingredient (etablissement_id, nom_normalise, unite_ref, prix_unitaire_cts, source)
       values ($1, 'beurre', 'kg', 900, 'manuel') returning id`,
      [etablissementA],
    );
    ingredientA = resultat.rows[0]!.id;
  });

  afterAll(async () => {
    await admin.end();
    const bootstrap = new Client(CONNEXION_ADMIN);
    await bootstrap.connect();
    await bootstrap.query(`drop database if exists ${NOM_BASE_TEST}`);
    await bootstrap.end();
  });

  async function requeteEnTantQue(userId: string, sql: string) {
    const client = new Client({ ...CONNEXION_ADMIN, database: NOM_BASE_TEST });
    await client.connect();
    await client.query("set role authenticated");
    await client.query("select set_config('request.jwt.claim.sub', $1, false)", [
      userId,
    ]);
    try {
      return await client.query(sql);
    } finally {
      await client.end();
    }
  }

  it("un utilisateur voit les ingrédients de son propre établissement", async () => {
    const resultat = await requeteEnTantQue(
      utilisateurA,
      "select * from ingredient",
    );
    expect(resultat.rows).toHaveLength(1);
    expect(resultat.rows[0]?.id).toBe(ingredientA);
  });

  it("un utilisateur ne voit jamais les ingrédients d'un autre établissement", async () => {
    const resultat = await requeteEnTantQue(
      utilisateurB,
      "select * from ingredient",
    );
    expect(resultat.rows).toHaveLength(0);
  });

  it("un utilisateur ne voit jamais l'établissement d'un autre", async () => {
    const resultat = await requeteEnTantQue(
      utilisateurB,
      "select * from etablissement",
    );
    expect(resultat.rows).toHaveLength(1);
    expect(resultat.rows[0]?.id).toBe(etablissementB);
  });

  it("une requête ciblée par id sur un ingrédient d'un autre établissement renvoie 0 ligne (pas une erreur)", async () => {
    const resultat = await requeteEnTantQue(
      utilisateurB,
      `select * from ingredient where id = '${ingredientA}'`,
    );
    expect(resultat.rows).toHaveLength(0);
  });

  it("un utilisateur ne peut pas insérer une ligne pour un autre établissement (violation de la policy WITH CHECK)", async () => {
    await expect(
      requeteEnTantQue(
        utilisateurB,
        `insert into ingredient (etablissement_id, nom_normalise, unite_ref, prix_unitaire_cts, source)
         values ('${etablissementA}', 'huile', 'L', 450, 'manuel')`,
      ),
    ).rejects.toThrow();
  });

  it("sans utilisateur authentifié (aucun claim sub), aucune ligne n'est visible", async () => {
    const client = new Client({ ...CONNEXION_ADMIN, database: NOM_BASE_TEST });
    await client.connect();
    await client.query("set role authenticated");
    try {
      const resultat = await client.query("select * from ingredient");
      expect(resultat.rows).toHaveLength(0);
    } finally {
      await client.end();
    }
  });
});

describe.skipIf(disponible)("RLS — isolation multi-tenant", () => {
  it.skip("PostgreSQL local indisponible sur 127.0.0.1:5432 — suite ignorée", () => {});
});
