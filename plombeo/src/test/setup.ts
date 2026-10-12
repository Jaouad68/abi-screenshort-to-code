import "dotenv/config";

// Secret de test : jamais utilisé en production, où SESSION_SECRET est fourni
// par l'environnement.
process.env["SESSION_SECRET"] ??= "secret-de-test-uniquement-0123456789abcdef";
