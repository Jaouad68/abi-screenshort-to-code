import { Label } from "../components/Label";

const rows = [
  ["Three hours", "Attendant, unlimited strips, digital copies", "595 GBP"],
  ["Four hours", "Everything above, plus the guest book", "695 GBP"],
  ["All evening, six hours", "Everything, plus a second props box and late collection", "845 GBP"],
];

export function Prices() {
  return (
    <section id="prices" className="section scroll-mt-[74px] border-t hairline !pt-16 lg:!pt-20">
      <div className="wrap">
        <Label>004/ Hire</Label>
        <table className="mt-10 w-full border-collapse text-left md:mt-14">
          <caption className="sr-only">Hire lengths, what is included, and price</caption>
          <thead>
            <tr className="meta border-b border-ink text-muted">
              <th scope="col" className="pb-3 font-normal">Length</th>
              <th scope="col" className="hidden pb-3 font-normal md:table-cell">Included</th>
              <th scope="col" className="pb-3 text-right font-normal">Price</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([length, included, price]) => (
              <tr key={length} className="border-b hairline align-baseline">
                <th scope="row" className="py-5 pr-4 font-normal md:w-[34%]">
                  <span className="font-display text-[24px] leading-tight md:text-[28px]">{length}</span>
                  <span className="mt-1 block text-[15px] text-muted md:hidden">{included}</span>
                </th>
                <td className="hidden py-5 pr-4 md:table-cell">{included}</td>
                <td className="py-5 text-right font-mono text-[15px] tracking-[0.06em] whitespace-nowrap">{price}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="meta mt-6 text-muted">Prices include travel within fifty miles of Leeds. Beyond that, 1 GBP a mile.</p>
      </div>
    </section>
  );
}
