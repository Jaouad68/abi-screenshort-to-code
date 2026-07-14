import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line py-6 px-6 text-center text-sm text-muted">
      <p>
        © {new Date().getFullYear()} RésaZen ·{" "}
        <Link href="/mentions-legales" className="hover:underline">
          Mentions légales
        </Link>{" "}
        ·{" "}
        <Link href="/politique-de-confidentialite" className="hover:underline">
          Politique de confidentialité
        </Link>
      </p>
    </footer>
  );
}
