import { describe, expect, it } from "vitest";
import { slotsFor } from "./slots";

const JOURNEE_STANDARD: [string, string][] = [
  ["09:00", "12:00"],
  ["14:00", "19:00"],
];

describe("slotsFor", () => {
  it("proposes every 15-minute slot that fits before the window closes", () => {
    const slots = slotsFor({
      fenetres: [["09:00", "10:00"]],
      dureeMin: 30,
      bufferMin: 0,
      occupes: [],
    });

    // last possible start is 09:30 (09:30 + 30min = 10:00, exactly at close)
    expect(slots).toEqual(["09:00", "09:15", "09:30"]);
  });

  it("never proposes a slot that would overrun the window close, including the buffer", () => {
    const slots = slotsFor({
      fenetres: [["09:00", "10:00"]],
      dureeMin: 30,
      bufferMin: 15,
      occupes: [],
    });

    // total occupancy is 45min, so the last valid start is 09:15 (09:15+45=10:00)
    expect(slots).toEqual(["09:00", "09:15"]);
    expect(slots).not.toContain("09:30");
  });

  it("never straddles a lunch break: no slot spills from the morning into the afternoon", () => {
    const slots = slotsFor({
      fenetres: JOURNEE_STANDARD,
      dureeMin: 45,
      bufferMin: 10,
      occupes: [],
    });

    // last morning slot: c + 55 <= 12:00 (720) => c <= 665 => 11:05, rounded down to the 15-min grid => 11:00
    expect(slots).toContain("11:00");
    expect(slots).not.toContain("11:15");
    // nothing at all inside the 12:00-14:00 break
    expect(slots.some((s) => s > "11:05" && s < "14:00")).toBe(false);
    // afternoon resumes exactly at window open
    expect(slots).toContain("14:00");
  });

  it("excludes slots already occupied by another appointment (buffer included)", () => {
    const slots = slotsFor({
      fenetres: [["09:00", "12:00"]],
      dureeMin: 45,
      bufferMin: 10,
      // an appointment occupying 09:30 -> 10:25 (buffer already folded into `fin`)
      occupes: [{ debut: "09:30", fin: "10:25" }],
    });

    expect(slots).not.toContain("09:30");
    expect(slots).not.toContain("10:00");
    // a candidate starting at 09:00 would run until 09:55, before the occupied
    // interval starts at 09:30 -> 09:00 itself overlaps (09:00 < 10:25 && 09:55 > 09:30) so excluded too
    expect(slots).not.toContain("09:00");
    // first free slot is the next 15-min grid mark once the occupied interval ends (10:25 -> 10:30)
    expect(slots).toContain("10:30");
  });

  it("does not exclude a candidate that only touches an occupied interval's edge", () => {
    const slots = slotsFor({
      fenetres: [["09:00", "11:00"]],
      dureeMin: 30,
      bufferMin: 0,
      occupes: [{ debut: "09:30", fin: "10:00" }],
    });

    // 09:00-09:30 ends exactly when the occupied interval starts: no overlap
    expect(slots).toContain("09:00");
    // 10:00-10:30 starts exactly when the occupied interval ends: no overlap
    expect(slots).toContain("10:00");
    // 09:15 would run 09:15-09:45, overlapping 09:30-10:00
    expect(slots).not.toContain("09:15");
  });

  it("returns nothing for a closed day (no fenêtres)", () => {
    const slots = slotsFor({
      fenetres: [],
      dureeMin: 30,
      bufferMin: 0,
      occupes: [],
    });

    expect(slots).toEqual([]);
  });

  it("returns nothing when the service does not fit in any window", () => {
    const slots = slotsFor({
      fenetres: [["09:00", "09:20"]],
      dureeMin: 30,
      bufferMin: 0,
      occupes: [],
    });

    expect(slots).toEqual([]);
  });
});
