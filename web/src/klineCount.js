const KLINE_PERIODS = [
  { value: "5m", label: "5分钟", minutes: 5 },
  { value: "15m", label: "15分钟", minutes: 15 },
  { value: "30m", label: "30分钟", minutes: 30 },
  { value: "1h", label: "1小时", minutes: 60 },
  { value: "4h", label: "4小时", minutes: 240 },
  { value: "1d", label: "1天", minutes: 1440 },
  { value: "1w", label: "1周", minutes: 10080 },
];

function getPeriodByValue(periodValue) {
  return KLINE_PERIODS.find((item) => item.value === periodValue);
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function alignDateToPeriod(date, periodValue) {
  const period = getPeriodByValue(periodValue);
  if (!period || !(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  const aligned = new Date(date);

  if (periodValue === "1w") {
    const weekday = aligned.getDay();
    const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
    aligned.setDate(aligned.getDate() - daysFromMonday);
    aligned.setHours(0, 0, 0, 0);
    return aligned;
  }

  if (periodValue === "1d") {
    aligned.setHours(0, 0, 0, 0);
    return aligned;
  }

  if (period.minutes === 240) {
    aligned.setHours(Math.floor(aligned.getHours() / 4) * 4, 0, 0, 0);
    return aligned;
  }

  if (period.minutes === 60) {
    aligned.setMinutes(0, 0, 0);
    return aligned;
  }

  const totalMinutes = aligned.getHours() * 60 + aligned.getMinutes();
  const snappedMinutes = Math.floor(totalMinutes / period.minutes) * period.minutes;
  aligned.setHours(Math.floor(snappedMinutes / 60), snappedMinutes % 60, 0, 0);
  return aligned;
}

function isDateAlignedToPeriod(date, periodValue) {
  const aligned = alignDateToPeriod(date, periodValue);
  if (!aligned) return false;
  return aligned.getTime() === date.getTime();
}

function getDatetimeLocalStep(periodValue) {
  const stepMap = {
    "5m": 300,
    "15m": 900,
    "30m": 1800,
    "1h": 3600,
    "4h": 14400,
  };
  return stepMap[periodValue];
}

function formatDatetimeLocalValue(date, periodValue) {
  if (!date) return "";

  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());

  if (periodValue === "1d" || periodValue === "1w") {
    return `${year}-${month}-${day}`;
  }

  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseDatetimeLocalValue(value, periodValue) {
  if (!value) return null;

  const date =
    periodValue === "1d" || periodValue === "1w"
      ? new Date(`${value}T00:00:00`)
      : new Date(value);

  if (Number.isNaN(date.getTime())) return null;
  return alignDateToPeriod(date, periodValue);
}

function calculateKlineBackTime(startDate, periodValue, barCount) {
  const period = getPeriodByValue(periodValue);
  const count = Number(barCount);

  if (!period || !(startDate instanceof Date) || Number.isNaN(startDate.getTime()) || !Number.isFinite(count) || count < 0) {
    return null;
  }

  const alignedStart = alignDateToPeriod(startDate, periodValue);
  return new Date(alignedStart.getTime() - period.minutes * 60 * 1000 * count);
}

function formatDisplayDateTime(date, periodValue) {
  if (!date) return "--";

  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());

  if (periodValue === "1d") {
    return `${year}年${month}月${day}日`;
  }

  if (periodValue === "1w") {
    return `${year}年${month}月${day}日（当周）`;
  }

  return `${year}年${month}月${day}日 ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function getPeriodTimeSlots(periodValue) {
  const period = getPeriodByValue(periodValue);
  if (!period || periodValue === "1d" || periodValue === "1w") {
    return [];
  }

  const slots = [];
  for (let minutesOfDay = 0; minutesOfDay < 1440; minutesOfDay += period.minutes) {
    const hours = Math.floor(minutesOfDay / 60);
    const minutes = minutesOfDay % 60;
    const label = `${pad2(hours)}:${pad2(minutes)}`;
    slots.push({ value: label, label, minutesOfDay });
  }
  return slots;
}

function getDateOnlyValue(date) {
  if (!date) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function getTimeOfDayValue(date, periodValue) {
  if (!date) return "";
  const aligned = alignDateToPeriod(date, periodValue) || date;
  return `${pad2(aligned.getHours())}:${pad2(aligned.getMinutes())}`;
}

function combineDateAndTime(dateValue, timeValue, periodValue) {
  if (!dateValue) return null;
  const time = timeValue || "00:00";
  const date = new Date(`${dateValue}T${time}:00`);
  if (Number.isNaN(date.getTime())) return null;
  return alignDateToPeriod(date, periodValue);
}

function buildKlineCountSummary({ periodValue, startDate, barCount, resultDate }) {
  const period = getPeriodByValue(periodValue);
  const count = Number(barCount);

  if (!period || !startDate || !resultDate || !Number.isFinite(count) || count < 0) {
    return null;
  }

  return `从 ${formatDisplayDateTime(startDate, periodValue)} 往前数 ${count} 根 ${period.label} K 线，对应时间为 ${formatDisplayDateTime(resultDate, periodValue)}`;
}

module.exports = {
  KLINE_PERIODS,
  alignDateToPeriod,
  isDateAlignedToPeriod,
  getDatetimeLocalStep,
  formatDatetimeLocalValue,
  parseDatetimeLocalValue,
  calculateKlineBackTime,
  formatDisplayDateTime,
  buildKlineCountSummary,
  getPeriodTimeSlots,
  getDateOnlyValue,
  getTimeOfDayValue,
  combineDateAndTime,
};
