/** Public link (no account) letting a client confirm or cancel a booking from an SMS. */
export function lienRendezVous(bookingToken: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  return `${base}/b/${bookingToken}`;
}
