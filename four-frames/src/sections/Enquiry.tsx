import { PhotoStrip } from "../components/DevelopingStrip";
import { Pill } from "../components/Pill";
import { MAILTO, PHONE, TEL } from "../content";

export function Enquiry() {
  return (
    <section id="enquire" className="scroll-mt-[74px] p-2 md:p-4">
      <div className="relative overflow-hidden rounded-[var(--panel-radius)] bg-accent text-on-accent">
        <div className="wrap grid gap-12 pb-0 pt-20 md:grid-cols-12 md:pt-28">
          <div className="pb-4 md:col-span-8 md:pb-28">
            <h2 className="display section-title max-w-[760px] md:!text-[clamp(56px,6.6vw,96px)]">
              Tell us the date and the room.
            </h2>
            <div className="mt-10 flex flex-wrap gap-3">
              <Pill href={MAILTO} tone="paper">
                Check your date
              </Pill>
              <Pill href={TEL} tone="ink">{`Call ${PHONE}`}</Pill>
            </div>
            <p className="meta mt-8 opacity-80">We take one booking a night per booth.</p>
          </div>
          <div className="relative flex h-[260px] justify-center md:col-span-4 md:h-auto md:justify-end">
            <PhotoStrip
              strip={10}
              develop
              caption="Four Frames. Leeds"
              className="absolute top-6 w-[118px] md:right-12 md:top-40 md:w-[132px] lg:top-32"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
