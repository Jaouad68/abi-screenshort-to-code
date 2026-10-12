import { requireGarage } from "@/lib/auth";
import { ParametresForm } from "./ParametresForm";

export default async function ParametresPage() {
  const garage = await requireGarage();

  return <ParametresForm garage={garage} />;
}
