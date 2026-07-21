import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Client Anthropic — usage serveur uniquement. La clé API n'est jamais
 * exposée côté client : ce module ne doit être importé que depuis des
 * Route Handlers ou Server Components.
 */
export function creerClientAnthropic(): Anthropic {
  return new Anthropic();
}

export const MODELE_VISION = "claude-sonnet-4-6";
