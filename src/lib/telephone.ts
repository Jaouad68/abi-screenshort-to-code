import { z } from "zod";

/** Normalizes then validates a French mobile number ("06 12 34 56 78" -> "0612345678"). */
export const telephoneMobileFr = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s.-]/g, ""))
  .pipe(z.string().regex(/^(0|\+33)[1-9]\d{8}$/, "Numéro de mobile invalide."));
