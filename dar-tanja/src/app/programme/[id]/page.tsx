import { FicheView } from "./fiche-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FicheView id={id} />;
}
