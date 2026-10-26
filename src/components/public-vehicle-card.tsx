import Link from "next/link";
import { formatCurrency } from "@/lib/format";

export function PublicVehicleCard({
  slug,
  vehicle,
}: {
  slug: string;
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    category: string | null;
    seats: number | null;
    transmission: string | null;
    dailyRate: number;
    photoUrl: string | null;
  };
}) {
  return (
    <Link
      href={`/r/${slug}/fleet/${vehicle.id}`}
      className="group overflow-hidden rounded-xl border border-line bg-white transition hover:shadow-lg"
    >
      <div className="aspect-[4/3] bg-canvas">
        {vehicle.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vehicle.photoUrl}
            alt={`${vehicle.make} ${vehicle.model}`}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">
            🚗
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="font-semibold text-ink">
          {vehicle.make} {vehicle.model}
        </p>
        <p className="mt-0.5 text-xs text-ink-soft">
          {[vehicle.category, vehicle.seats ? `${vehicle.seats} Seater` : null, vehicle.transmission]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="mt-2 text-lg font-bold text-brand">
          {formatCurrency(vehicle.dailyRate)}
          <span className="text-sm font-normal text-ink-soft">/day</span>
        </p>
      </div>
    </Link>
  );
}
