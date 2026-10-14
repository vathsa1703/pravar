import { describe, expect, it } from "vitest";
import { followUpState, overdueLabel, timeAgo, todayWindow } from "./time";

// Tests run with TZ=Asia/Kolkata (see vitest.config.ts) so "local day" != UTC day.

describe("todayWindow", () => {
  it("covers the local calendar day, expressed in UTC", () => {
    const now = new Date("2026-10-14T20:00:00Z"); // 01:30 on 15 Oct in IST
    expect(todayWindow(now)).toEqual({
      dayStart: "2026-10-14T18:30:00.000Z", // 15 Oct 00:00 IST
      dayEnd: "2026-10-15T18:30:00.000Z", // 16 Oct 00:00 IST
    });
  });

  it("puts 11:30 pm today inside and 12:30 am tomorrow outside", () => {
    const now = new Date("2026-10-14T06:30:00Z"); // 12:00 IST
    const { dayStart, dayEnd } = todayWindow(now);
    const inside = new Date("2026-10-14T18:00:00Z"); // 23:30 IST
    const outside = new Date("2026-10-14T19:00:00Z"); // 00:30 IST next day
    expect(inside >= new Date(dayStart) && inside < new Date(dayEnd)).toBe(true);
    expect(outside < new Date(dayEnd)).toBe(false);
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-10-14T12:00:00Z");
  it.each([
    ["2026-10-14T11:59:30Z", "just now"],
    ["2026-10-14T11:59:00Z", "1 minute ago"],
    ["2026-10-14T10:00:00Z", "2 hours ago"],
    ["2026-10-11T12:00:00Z", "3 days ago"],
  ])("%s -> %s", (iso, expected) => {
    expect(timeAgo(iso, now)).toBe(expected);
  });
});

describe("followUpState", () => {
  const now = new Date("2026-10-14T06:30:00Z");
  const base = { follow_up_today: false, is_overdue: false };

  it("none without a follow-up", () => {
    expect(followUpState({ ...base, next_follow_up_at: null }, now)).toBe("none");
  });
  it("overdue comes from the server flag", () => {
    expect(followUpState({ ...base, is_overdue: true, next_follow_up_at: "2026-10-10T06:00:00Z" }, now)).toBe("overdue");
  });
  it("today: upcoming vs already passed", () => {
    const today = { ...base, follow_up_today: true };
    expect(followUpState({ ...today, next_follow_up_at: "2026-10-14T09:00:00Z" }, now)).toBe("today");
    expect(followUpState({ ...today, next_follow_up_at: "2026-10-14T03:00:00Z" }, now)).toBe("due-earlier");
  });
});

describe("overdueLabel", () => {
  it("counts calendar days", () => {
    const now = new Date("2026-10-14T06:30:00Z");
    expect(overdueLabel("2026-10-11T06:30:00Z", now)).toBe("Overdue by 3 days");
    expect(overdueLabel("2026-10-13T17:00:00Z", now)).toBe("Overdue by 1 day"); // 22:30 IST yesterday
  });
});
