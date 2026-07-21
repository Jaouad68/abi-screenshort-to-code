import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: [
        "src/lib/**/*.test.ts",
        "src/lib/supabase/**",
        // Wrappers d'appel réseau (Anthropic) : pas de logique propre à
        // tester sans identifiants réels, contrairement aux pipelines de
        // parsing/retry (lib/factures, lib/carte, lib/fiches) qui, eux,
        // sont testés sans appel réseau.
        "src/lib/anthropic/**",
        // Orchestration DB + LLM (lecture plat/établissement, appel du
        // pipeline déjà testé, rapprochement par nom) : pas de logique
        // propre au-delà de ce que couvrent déjà generation.test.ts et
        // normalisation.test.ts.
        "src/lib/fiches/proposer.ts",
      ],
      thresholds: {
        lines: 80,
        statements: 80,
      },
    },
  },
});
