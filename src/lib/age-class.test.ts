import { describe, expect, it } from "vitest";
import { ageOnDate, checkAgeClass } from "./age-class";

const RACE = "2026-11-15";

describe("ageOnDate", () => {
  it("birthday exactly on race day counts completed years only", () => {
    expect(ageOnDate("2008-11-15", RACE)).toBe(18);
  });
  it("every other rider gets completed years + 1", () => {
    expect(ageOnDate("1999-11-22", RACE)).toBe(27); // completed 26
    expect(ageOnDate("2008-11-16", RACE)).toBe(18); // completed 17
    expect(ageOnDate("2008-09-01", RACE)).toBe(19); // completed 18
  });
  it("matches the example 8 Nov 1981 -> 46", () => {
    expect(ageOnDate("1981-11-08", RACE)).toBe(46);
  });
  it("29 Feb birthday gets +1 like any other non-race-day birthday", () => {
    expect(ageOnDate("2008-02-29", RACE)).toBe(19);
  });
});

describe("checkAgeClass", () => {
  it("17 in under_18 is fine, 18 is a mismatch suggesting 18_35", () => {
    expect(checkAgeClass("under_18", "2009-11-16", RACE).mismatch).toBe(false); // age 17
    expect(checkAgeClass("under_18", "2008-11-15", RACE)).toEqual({ age: 18, mismatch: true, suggestedId: "18_35" });
  });
  it("35 fits 18_35, 36 does not and suggests 35_45", () => {
    expect(checkAgeClass("18_35", "1991-11-15", RACE).mismatch).toBe(false); // age 35
    expect(checkAgeClass("18_35", "1990-11-15", RACE).suggestedId).toBe("35_45"); // age 36
  });
  it("35 in 35_45 is a mismatch", () => {
    expect(checkAgeClass("35_45", "1991-11-15", RACE).mismatch).toBe(true); // age 35
  });
  it("45/46 boundary", () => {
    expect(checkAgeClass("35_45", "1981-11-15", RACE).mismatch).toBe(false); // age 45
    expect(checkAgeClass("45_60", "1981-11-15", RACE).mismatch).toBe(true); // age 45
    expect(checkAgeClass("45_60", "1980-11-15", RACE).mismatch).toBe(false); // age 46
  });
  it("60/61 boundary", () => {
    expect(checkAgeClass("45_60", "1966-11-15", RACE).mismatch).toBe(false); // age 60
    expect(checkAgeClass("over_60", "1966-11-15", RACE).mismatch).toBe(true); // age 60
    expect(checkAgeClass("over_60", "1965-11-15", RACE).mismatch).toBe(false); // age 61
  });
  it("open_under_45: 44 ok, 45 mismatch, never suggested", () => {
    expect(checkAgeClass("open_under_45", "1982-11-15", RACE).mismatch).toBe(false); // age 44
    const r = checkAgeClass("open_under_45", "1981-11-15", RACE); // age 45
    expect(r.mismatch).toBe(true);
    expect(r.suggestedId).toBe("35_45");
  });
  it("women, unknown class and missing DOB give no alert", () => {
    expect(checkAgeClass("women", "2015-01-01", RACE).mismatch).toBe(false);
    expect(checkAgeClass("mystery", "2015-01-01", RACE).mismatch).toBe(false);
    expect(checkAgeClass("under_18", null, RACE).mismatch).toBe(false);
  });
});
