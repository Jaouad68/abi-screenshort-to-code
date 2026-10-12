import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // `server-only` lève une erreur dès l'import hors composant serveur.
      // Le neutraliser sous test permet d'exercer réellement le DAL et les
      // modules de sécurité, plutôt que de les laisser non testés.
      "server-only": path.resolve(__dirname, "./src/test/server-only-stub.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
    // Les tests d'intégration partagent une base de données : les exécuter en
    // parallèle les ferait interférer.
    fileParallelism: false,
  },
});
