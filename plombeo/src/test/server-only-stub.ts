// Remplace le paquet `server-only` sous test (voir vitest.config.ts).
// En production, ce paquet garantit qu'un module serveur ne peut pas être
// importé par erreur dans un composant client ; cette garantie est assurée par
// le build Next.js, pas par les tests.
export {};
