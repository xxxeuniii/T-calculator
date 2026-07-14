import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { unstable_createElement as createElement } from "react-native-web";
import styles from "../styles";
import {
  KLINE_PERIODS,
  alignDateToPeriod,
  calculateKlineBackTime,
  combineDateAndTime,
  formatDisplayDateTime,
  getDateOnlyValue,
  getPeriodTimeSlots,
  getTimeOfDayValue,
} from "../klineCount";

const controlStyle = {
  minHeight: 46,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#e4e4e4",
  borderRadius: 7,
  paddingLeft: 14,
  paddingRight: 14,
  fontSize: 17,
  color: "#151515",
  backgroundColor: "#ffffff",
  boxSizing: "border-box",
};

function PeriodDateTimeInput({ value, period, onChange }) {
  if (Platform.OS !== "web") {
    return (
      <View style={styles.klineDateFallback}>
        <Text style={styles.klineDateFallbackText}>日期时间选择器仅支持 Web 端</Text>
      </View>
    );
  }

  const isDateOnly = period === "1d" || period === "1w";
  const dateValue = getDateOnlyValue(value);
  const timeValue = getTimeOfDayValue(value, period);
  const timeSlots = getPeriodTimeSlots(period);

  const dateInput = createElement("input", {
    type: "date",
    value: dateValue,
    onChange: (event) => {
      const next = combineDateAndTime(event.target.value, timeValue, period);
      if (next) onChange(next);
    },
    style: { ...controlStyle, flex: isDateOnly ? undefined : 1, width: isDateOnly ? "100%" : undefined },
  });

  if (isDateOnly) {
    return dateInput;
  }

  const timeSelect = createElement(
    "select",
    {
      value: timeValue,
      onChange: (event) => {
        const next = combineDateAndTime(dateValue, event.target.value, period);
        if (next) onChange(next);
      },
      style: { ...controlStyle, width: 120, cursor: "pointer" },
    },
    timeSlots.map((slot) =>
      createElement("option", { key: slot.value, value: slot.value }, slot.label)
    )
  );

  return (
    <View style={styles.klineDateTimeRow}>
      {dateInput}
      {timeSelect}
    </View>
  );
}

export default function KlineCountScreen({ isDesktop }) {
  const [period, setPeriod] = useState("30m");
  const [selectedDate, setSelectedDate] = useState(() => alignDateToPeriod(new Date(), "30m"));
  const [barCount, setBarCount] = useState("200");

  useEffect(() => {
    setSelectedDate((current) => alignDateToPeriod(current || new Date(), period));
  }, [period]);

  const alignedDate = useMemo(() => alignDateToPeriod(selectedDate, period), [selectedDate, period]);
  const resultDate = useMemo(() => {
    if (!alignedDate) return null;
    return calculateKlineBackTime(alignedDate, period, barCount);
  }, [alignedDate, period, barCount]);

  const periodHint = useMemo(() => {
    const current = KLINE_PERIODS.find((item) => item.value === period);
    if (!current) return "";

    if (period === "1d") {
      return "日线按自然日对齐，时间固定为 00:00。";
    }
    if (period === "1w") {
      return "周线按周一 00:00 对齐。";
    }
    if (period === "4h") {
      return "4 小时线仅可选 00:00、04:00、08:00、12:00、16:00、20:00。";
    }
    if (period === "1h") {
      return "1 小时线仅可选整点时刻。";
    }
    return `${current.label}周期仅可选 ${current.minutes} 分钟的整数倍时刻。`;
  }, [period]);

  function handleBarCountChange(value) {
    if (value === "" || /^\d+$/.test(value)) {
      setBarCount(value);
    }
  }

  function stepBarCount(delta) {
    const current = Number(barCount) || 0;
    const next = Math.max(0, current + delta);
    setBarCount(String(next));
  }

  return (
    <>
      <View style={{ width: isDesktop ? "48%" : "100%", maxWidth: isDesktop ? 420 : "100%" }}>
        <View style={styles.panel}>
          <Text style={styles.klineSectionLabel}>时间周期</Text>
          <View style={styles.klinePeriodRow}>
            {KLINE_PERIODS.map((item) => {
              const active = period === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setPeriod(item.value)}
                  style={[styles.klinePeriodChip, active && styles.klinePeriodChipActive]}
                >
                  <Text style={[styles.klinePeriodChipText, active && styles.klinePeriodChipTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.fieldGrid}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>选择时间</Text>
              <PeriodDateTimeInput value={alignedDate} period={period} onChange={setSelectedDate} />
              <Text style={styles.klineHint}>{periodHint}</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>K 线根数</Text>
              <View style={styles.stepInputRow}>
                <TextInput
                  value={barCount}
                  onChangeText={handleBarCountChange}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  placeholder="例如 200"
                  style={styles.stepInput}
                  selectionColor="#151515"
                />
                <Pressable onPress={() => stepBarCount(-1)} style={styles.stepButton}>
                  <Text style={styles.stepButtonText}>-</Text>
                </Pressable>
                <Pressable onPress={() => stepBarCount(1)} style={styles.stepButton}>
                  <Text style={styles.stepButtonText}>+</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={{ width: isDesktop ? "48%" : "100%", maxWidth: isDesktop ? 420 : "100%" }}>
        <View style={styles.resultPanel}>
          <View style={styles.primaryResult}>
            <Text style={styles.primaryLabel}>对应时间</Text>
            <Text style={styles.klineResultValue}>{resultDate ? formatDisplayDateTime(resultDate, period) : "--"}</Text>
          </View>
        </View>
      </View>
    </>
  );
}
