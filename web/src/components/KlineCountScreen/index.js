import React, { createElement, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import styles from "./styles";
import {
  KLINE_PERIODS,
  alignDateToPeriod,
  calculateKlineBackTime,
  combineDateAndTime,
  formatDisplayDateTime,
  getDateOnlyValue,
  getPeriodTimeSlots,
  getTimeOfDayValue,
} from "../../klineCount";

const webControlStyle = {
  minHeight: 46,
  height: 46,
  border: "1px solid #e4e4e4",
  borderRadius: 7,
  paddingLeft: 14,
  paddingRight: 14,
  fontSize: 17,
  color: "#151515",
  backgroundColor: "#ffffff",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
  WebkitAppearance: "auto",
  appearance: "auto",
  pointerEvents: "auto",
  position: "relative",
  zIndex: 20,
  overflow: "visible",
};

function PeriodDateTimeInput({ value, period, onChange }) {
  const dateRef = useRef(null);

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

  function handleDateChange(event) {
    const next = combineDateAndTime(event.target.value, timeValue || "00:00", period);
    if (next) onChange(next);
  }

  function openDatePicker() {
    const input = dateRef.current;
    if (!input) return;
    try {
      if (typeof input.showPicker === "function") {
        input.showPicker();
        return;
      }
    } catch (_) {
    }
    input.focus();
    input.click();
  }

  const dateRow = createElement(
    "div",
    {
      key: "date-row",
      style: {
        display: "flex",
        width: "100%",
        gap: 8,
        alignItems: "stretch",
      },
    },
    createElement("input", {
      ref: dateRef,
      type: "date",
      value: dateValue,
      onChange: handleDateChange,
      onInput: handleDateChange,
      style: {
        ...webControlStyle,
        flex: 1,
        width: "100%",
        minWidth: 160,
      },
    }),
    createElement(
      "button",
      {
        type: "button",
        onClick: openDatePicker,
        style: {
          ...webControlStyle,
          width: 72,
          flexShrink: 0,
          cursor: "pointer",
          fontWeight: 700,
          paddingLeft: 0,
          paddingRight: 0,
          backgroundColor: "#f7f7f7",
        },
      },
      "选择"
    )
  );

  const children = [dateRow];

  if (!isDateOnly) {
    children.push(
      createElement(
        "select",
        {
          key: "time",
          value: timeValue,
          onChange: (event) => {
            const next = combineDateAndTime(dateValue, event.target.value, period);
            if (next) onChange(next);
          },
          style: {
            ...webControlStyle,
            width: "100%",
            cursor: "pointer",
          },
        },
        timeSlots.map((slot) =>
          createElement("option", { key: slot.value, value: slot.value }, slot.label)
        )
      )
    );
  }

  return createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 8,
        width: "100%",
        position: "relative",
        zIndex: 20,
        pointerEvents: "auto",
        overflow: "visible",
      },
    },
    children
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
            <View style={[styles.field, styles.klineDateField]}>
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
