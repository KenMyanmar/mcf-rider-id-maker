import { describe, expect, it } from "vitest";
import { ageOnDate, checkAgeClass } from "./age-class";

const RACE = "2026-11-15";

describe("ageOnDate", () => {
  it("counts the birthday on race day as completed", () => {
    expect(ageOnDate("2008-11-15", RACE)).toBe(18);
  });
  it("day before birthday is still the lower age", () => {
    expect(ageOnDate("2008-11-16", RACE)).toBe(17);
  });
  it("matches the example 1 Sep 2008 -> 18", () => {
    expect(ageOnDate("2008-09-01", RACE)).toBe(18);
  });
});

describe("checkAgeClass", () => {
  it("17 in under_18 is fine, 18 is a mismatch suggesting 18_35", () => {
    expect(checkAgeClass("under_18", "2008-11-16", RACE).mismatch).toBe(false);
    expect(checkAgeClass("under_18", "2008-11-15", RACE)).toEqual({ age: 18, mismatch: true, suggestedId: "18_35" });
  });
  it("35 fits 18_35, 36 does not and suggests 35_45", () => {
    expect(checkAgeClass("18_35", "1991-11-15", RACE).mismatch).toBe(false);
    expect(checkAgeClass("18_35", "1990-11-15", RACE).suggestedId).toBe("35_45");
  });
  it("35 in 35_45 is a mismatch", () => {
    expect(checkAgeClass("35_45", "1991-11-15", RACE).mismatch).toBe(true);
  });
  it("45/46 boundary", () => {
    expect(checkAgeClass("35_45", "1981-11-15", RACE).mismatch).toBe(false);
    expect(checkAgeClass("45_60", "1981-11-15", RACE).mismatch).toBe(true);
    expect(checkAgeClass("45_60", "1980-11-15", RACE).mismatch).toBe(false);
  });
  it("60/61 boundary", () => {
    expect(checkAgeClass("45_60", "1966-11-15", RACE).mismatch).toBe(false);
    expect(checkAgeClass("over_60", "1966-11-15", RACE).mismatch).toBe(true);
    expect(checkAgeClass("over_60", "1965-11-15", RACE).mismatch).toBe(false);
  });
  it("open_under_45: 44 ok, 45 mismatch, never suggested", () => {
    expect(checkAgeClass("open_under_45", "1982-11-15", RACE).mismatch).toBe(false);
    const r = checkAgeClass("open_under_45", "1981-11-15", RACE);
    expect(r.mismatch).toBe(true);
    expect(r.suggestedId).toBe("35_45");
  });
  it("women, unknown class and missing DOB give no alert", () => {
    expect(checkAgeClass("women", "2015-01-01", RACE).mismatch).toBe(false);
    expect(checkAgeClass("mystery", "2015-01-01", RACE).mismatch).toBe(false);
    expect(checkAgeClass("under_18", null, RACE).mismatch).toBe(false);
  });
});
