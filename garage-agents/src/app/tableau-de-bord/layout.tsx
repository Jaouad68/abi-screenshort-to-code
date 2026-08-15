import { requireGarageEtEmail } from "@/lib/auth";
import { Shell } from "./Shell";

export default async function TableauDeBordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const garage = await requireGarageEtEmail();

  return (
    <Shell nomGarage={garage.nom} email={garage.user.email}>
      {children}
    </Shell>
  );
}
