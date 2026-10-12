"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Defers rendering until after the first client-side commit, avoiding a
 * server/client markup mismatch for state hydrated from localStorage
 * (notes and lesson progress).
 */
export function ClientOnly({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  if (!mounted) return null;
  return <>{children}</>;
}
