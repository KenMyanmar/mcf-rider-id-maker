import { describe, expect, it } from "vitest";
import { last8Phone, nrcMatches, phonesMatch, sizeLeft } from "./shirt-stock";

describe("sizeLeft", () => {
  it("stock minus paid/confirmed riders of that size", () => {
    expect(sizeLeft({ M: 150, L: 150 }, "L", { L: 20, M: 5 })).toBe(130);
  });

  it("floors at 0 when over-subscribed", () => {
    expect(sizeLeft({ "3XL": 30 }, "3XL", { "3XL": 35 })).toBe(0);
  });

  it("a size absent from stock has 0 left", () => {
    expect(sizeLeft({ M: 150 }, "XL", {})).toBe(0);
  });

  it("no stock data at all means 0 left", () => {
    expect(sizeLeft(null, "L", { L: 10 })).toBe(0);
    expect(sizeLeft(undefined, "L", {})).toBe(0);
  });

  it("registered (not yet paid) riders do not consume stock", () => {
    // paidConfirmedCounts only contains paid/confirmed riders by construction
    expect(sizeLeft({ L: 150 }, "L", {})).toBe(150);
  });
});

describe("last8Phone", () => {
  it("keeps only digits, last 8", () => {
    expect(last8Phone("+95 9 123 456 789")).toBe("23456789");
    expect(last8Phone("09-1234567")).toBe("9-1234567".replace(/\D/g, "").slice(-8));
  });
});

describe("phonesMatch", () => {
  it("matches same number in different formats", () => {
    expect(phonesMatch("+959123456789", "09 1234567 89")).toBe(true);
  });

  it("does not match different numbers", () => {
    expect(phonesMatch("+959123456789", "+959123456780")).toBe(false);
  });

  it("short numbers never match", () => {
    expect(phonesMatch("12345", "12345")).toBe(false);
  });
});

describe("nrcMatches", () => {
  it("matches case-insensitively with surrounding space", () => {
    expect(nrcMatches(" 12/ABC(N)123456 ", "12/abc(n)123456")).toBe(true);
  });

  it("empty values never match", () => {
    expect(nrcMatches("", "")).toBe(false);
    expect(nrcMatches("", "12/ABC(N)123456")).toBe(false);
  });
});
