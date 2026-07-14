const assert = require("node:assert/strict");

const {
  alignDateToPeriod,
  calculateKlineBackTime,
  combineDateAndTime,
  formatDisplayDateTime,
  getPeriodTimeSlots,
  getTimeOfDayValue,
  isDateAlignedToPeriod,
  parseDatetimeLocalValue,
} = require("../src/klineCount");

const start = alignDateToPeriod(new Date("2026-07-13T10:30:00"), "30m");
assert.ok(start);
assert.equal(formatDisplayDateTime(start, "30m"), "2026年07月13日 10:30");

const invalid = parseDatetimeLocalValue("2026-07-13T07:35", "30m");
assert.equal(formatDisplayDateTime(invalid, "30m"), "2026年07月13日 07:30");

assert.equal(isDateAlignedToPeriod(new Date("2026-07-13T10:30:00"), "30m"), true);
assert.equal(isDateAlignedToPeriod(new Date("2026-07-13T10:35:00"), "30m"), false);

const back200 = calculateKlineBackTime(start, "30m", 200);
assert.equal(formatDisplayDateTime(back200, "30m"), "2026年07月09日 06:30");

const hourAligned = alignDateToPeriod(new Date("2026-07-13T10:45:00"), "1h");
assert.equal(formatDisplayDateTime(hourAligned, "1h"), "2026年07月13日 10:00");

const fourHourAligned = alignDateToPeriod(new Date("2026-07-13T11:20:00"), "4h");
assert.equal(formatDisplayDateTime(fourHourAligned, "4h"), "2026年07月13日 08:00");

const weekAligned = alignDateToPeriod(new Date("2026-07-13T15:30:00"), "1w");
assert.equal(formatDisplayDateTime(weekAligned, "1w"), "2026年07月13日（当周）");

const slots5m = getPeriodTimeSlots("5m");
assert.equal(slots5m.length, 288);
assert.equal(slots5m[0].value, "00:00");
assert.equal(slots5m[1].value, "00:05");

const slots30m = getPeriodTimeSlots("30m");
assert.equal(slots30m.length, 48);
assert.deepEqual(slots30m.slice(0, 3).map((s) => s.value), ["00:00", "00:30", "01:00"]);

const slots4h = getPeriodTimeSlots("4h");
assert.deepEqual(slots4h.map((s) => s.value), ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"]);

assert.equal(getPeriodTimeSlots("1d").length, 0);

assert.equal(getTimeOfDayValue(new Date("2026-07-13T10:37:00"), "30m"), "10:30");

const combined = combineDateAndTime("2026-07-13", "10:30", "30m");
assert.equal(formatDisplayDateTime(combined, "30m"), "2026年07月13日 10:30");

console.log("klineCount tests passed");
