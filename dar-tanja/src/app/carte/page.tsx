import type { Metadata } from "next";
import { CarteView } from "./carte-view";

export const metadata: Metadata = { title: "Carte" };

export default function Page() {
  return <CarteView />;
}
