import { describe, expect, it } from "vitest";
import { bibInClass, classBibUsage, classCapacity, formatBibRange } from "./bib-blocks";

const m4560 = { bib_start: 701, bib_end: 800, bib_start_2: 851, bib_end_2: 900 };
const women = { bib_start: 801, bib_end: 850 };

describe("bib blocks", () => {
  it("45_60 capacity is 150", () => expect(classCapacity(m4560)).toBe(150));
  it("women capacity is 50", () => expect(classCapacity(women)).toBe(50));
  it("range text shows both blocks", () => expect(formatBibRange(m4560)).toBe("701–800, 851–900"));
  it("800 and 851 inside 45_60, 825 not", () => {
    expect(bibInClass(m4560, 800)).toBe(true);
    expect(bibInClass(m4560, 851)).toBe(true);
    expect(bibInClass(m4560, 825)).toBe(false);
  });
  it("a bib held by a rider of another class still counts as used", () => {
    // 97 class riders + 3 riders of other classes hold all of 701–800
    const raceBibs = Array.from({ length: 100 }, (_, i) => 701 + i);
    expect(classBibUsage(m4560, raceBibs)).toEqual({ capacity: 150, used: 100, left: 50 });
  });
  it("bibs outside the blocks are not counted", () => {
    expect(classBibUsage(women, [801, 802, 700, 851]).used).toBe(2);
  });
});
