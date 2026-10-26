import { redirect } from "next/navigation";

/** Old booking route — the flow now lives inline on the vehicle detail page. */
export default async function LegacyBookRedirect({
  params,
}: {
  params: Promise<{ slug: string; vehicleId: string }>;
}) {
  const { slug, vehicleId } = await params;
  redirect(`/r/${slug}/fleet/${vehicleId}#book`);
}
