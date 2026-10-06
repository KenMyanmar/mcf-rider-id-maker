import { describe, expect, it } from "vitest";
import { ageOnDate, ageYearsMonths, checkAgeClass, formatAge } from "./age-class";

const RACE = "2026-11-15";

describe("ageOnDate / ageYearsMonths / formatAge", () => {
  it("birthday exactly on race day has completed the year", () => {
    expect(ageOnDate("2008-11-15", RACE)).toBe(18);
    expect(formatAge("2008-11-15", RACE)).toBe("18y 0m");
  });
  it("plain completed years, no +1", () => {
    expect(ageOnDate("1999-11-22", RACE)).toBe(26);
    expect(ageOnDate("2008-11-16", RACE)).toBe(17);
    expect(ageOnDate("2008-09-01", RACE)).toBe(18);
  });
  it("matches the examples: 8 Nov 1981 -> 45y 0m, 17 Jan 2009 -> 17y 10m", () => {
    expect(formatAge("1981-11-08", RACE)).toBe("45y 0m");
    expect(formatAge("2009-01-17", RACE)).toBe("17y 10m");
  });
  it("months roll over correctly", () => {
    expect(ageYearsMonths("2008-12-20", RACE)).toEqual({ years: 17, months: 10 });
    expect(ageYearsMonths("2008-11-20", RACE)).toEqual({ years: 17, months: 11 });
  });
});

describe("checkAgeClass", () => {
  it("8 Nov 1981 (45y 0m) fits 45_60", () => {
    expect(checkAgeClass("45_60", "1981-11-08", RACE).mismatch).toBe(false);
    expect(checkAgeClass("35_45", "1981-11-08", RACE)).toEqual({ age: 45, mismatch: true, suggestedId: "45_60" });
  });
  it("17 Jan 2009 (17y 10m) fits under_18", () => {
    expect(checkAgeClass("under_18", "2009-01-17", RACE).mismatch).toBe(false);
    expect(checkAgeClass("18_35", "2009-01-17", RACE).suggestedId).toBe("under_18");
  });
  it("15 Nov 2008 turns 18 on race day: 18_35, not under_18", () => {
    expect(checkAgeClass("18_35", "2008-11-15", RACE).mismatch).toBe(false);
    expect(checkAgeClass("under_18", "2008-11-15", RACE)).toEqual({ age: 18, mismatch: true, suggestedId: "18_35" });
  });
  it("16 Nov 2008 (17y 11m) is under_18", () => {
    expect(checkAgeClass("under_18", "2008-11-16", RACE).mismatch).toBe(false);
    expect(checkAgeClass("18_35", "2008-11-16", RACE).suggestedId).toBe("under_18");
  });
  it("race-day birthday exception: turning 35, 45 or 60 stays in the lower class", () => {
    // turns 45 on race day -> stays in 35_45, mismatch in 45_60
    expect(checkAgeClass("35_45", "1981-11-15", RACE).mismatch).toBe(false);
    expect(checkAgeClass("45_60", "1981-11-15", RACE)).toEqual({ age: 45, mismatch: true, suggestedId: "35_45" });
    // turns 60 -> stays in 45_60
    expect(checkAgeClass("45_60", "1966-11-15", RACE).mismatch).toBe(false);
    expect(checkAgeClass("over_60", "1966-11-15", RACE).suggestedId).toBe("45_60");
    // turns 35 -> stays in 18_35
    expect(checkAgeClass("18_35", "1991-11-15", RACE).mismatch).toBe(false);
    expect(checkAgeClass("35_45", "1991-11-15", RACE).suggestedId).toBe("18_35");
  });
  it("34/35 boundary without the exception", () => {
    expect(checkAgeClass("18_35", "1992-11-14", RACE).mismatch).toBe(false); // 34
    expect(checkAgeClass("18_35", "1991-11-16", RACE).suggestedId).toBe("35_45"); // 35
    expect(checkAgeClass("35_45", "1991-11-16", RACE).mismatch).toBe(false); // 35
  });
  it("44/45 and 59/60 boundaries without the exception", () => {
    expect(checkAgeClass("35_45", "1982-11-16", RACE).mismatch).toBe(false); // 44
    expect(checkAgeClass("35_45", "1981-11-16", RACE).suggestedId).toBe("45_60"); // 45
    expect(checkAgeClass("45_60", "1967-11-16", RACE).mismatch).toBe(false); // 59
    expect(checkAgeClass("45_60", "1966-11-16", RACE).suggestedId).toBe("over_60"); // 60
    expect(checkAgeClass("over_60", "1966-11-16", RACE).mismatch).toBe(false); // 60
  });
  it("open_under_45: 44 ok, 45 mismatch", () => {
    expect(checkAgeClass("open_under_45", "1982-11-16", RACE).mismatch).toBe(false); // 44
    const r = checkAgeClass("open_under_45", "1981-11-16", RACE); // 45
    expect(r.mismatch).toBe(true);
    expect(r.suggestedId).toBe("45_60");
  });
  it("women, unknown class and missing DOB give no alert", () => {
    expect(checkAgeClass("women", "2015-01-01", RACE).mismatch).toBe(false);
    expect(checkAgeClass("mystery", "2015-01-01", RACE).mismatch).toBe(false);
    expect(checkAgeClass("under_18", null, RACE).mismatch).toBe(false);
  });
});
