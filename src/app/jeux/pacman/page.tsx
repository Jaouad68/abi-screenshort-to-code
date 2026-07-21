export const metadata = {
  title: "Pac-Man — RésaZen",
  description: "Un mini-jeu Pac-Man moderne, jouable au clavier ou au doigt.",
};

export default function PacmanPage() {
  return (
    <main className="flex-1 flex flex-col">
      <iframe
        src="/pacman.html"
        title="Pac-Man"
        className="w-full flex-1 border-0"
        style={{ minHeight: "100dvh" }}
      />
    </main>
  );
}
