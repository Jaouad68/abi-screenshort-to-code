import { Label } from "../components/Label";

export function Statement() {
  return (
    <section className="section border-t hairline">
      <div className="wrap grid gap-8 md:grid-cols-12 md:gap-6">
        <Label className="md:col-span-4">001/ The booths</Label>
        <p className="font-display text-[26px] leading-[1.22] tracking-[-0.01em] md:col-span-8 md:text-[34px] lg:text-[40px]">
          A digital booth prints a picture. A chemical booth makes one, in a tray, in the dark, while four people stand
          outside arguing about who blinked. The waiting is the point. Our three machines were built between 1972 and
          1979, and they still use the same silver based paper and the same four flashes, eight seconds apart.
        </p>
      </div>
    </section>
  );
}
