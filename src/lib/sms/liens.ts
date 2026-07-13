/** Public link (no account) letting a client confirm or cancel a booking from an SMS. */
export function lienRendezVous(bookingToken: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  return `${base}/b/${bookingToken}`;
}

/** Public booking page for a salon (used as the Stripe Checkout cancel_url). */
export function lienReservation(salonSlug: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  return `${base}/r/${salonSlug}`;
}
