import type { Metadata } from "next";
import { PresseView } from "./presse-view";

export const metadata: Metadata = {
  title: "Presse",
  description: "Revue de presse des 7 derniers jours sur la mobilisation lycéenne dans le Val-d'Oise.",
};

export default function Page() {
  return <PresseView />;
}
