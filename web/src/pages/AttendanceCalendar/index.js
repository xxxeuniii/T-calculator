import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import styles from "./styles";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const STATUS = [undefined, "present", "leave", "absent"];

function keyFor(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AttendanceCalendar({ attendance, onChange, onMonthChange, syncStatus, isDesktop }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  useEffect(() => {
    onMonthChange(monthKey);
  }, [monthKey]);

  const days = useMemo(() => {
    const count = new Date(year, month + 1, 0).getDate();
    const leading = (new Date(year, month, 1).getDay() + 6) % 7;
    return Array.from(
      { length: 42 },
      (_, index) => new Date(year, month, index - leading + 1)
    );
  }, [year, month]);

  const stats = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const workdayKeys = days
      .filter((date) => date.getMonth() === month && date.getDay() !== 0 && date.getDay() !== 6)
      .map(keyFor);
    const entries = Object.entries(attendance || {}).filter(
      ([key]) => key.startsWith(monthPrefix) && workdayKeys.includes(key)
    );
    const present = entries.filter(([, value]) => value === "present").length;
    const absent = entries.filter(([, value]) => value === "absent").length;
    const leave = entries.filter(([, value]) => value === "leave").length;
    const expected = workdayKeys.length;
    return { present, absent, leave, expected, rate: expected ? Math.round((present / expected) * 100) : 0 };
  }, [attendance, days, year, month]);

  function moveMonth(step) {
    setCursor(new Date(year, month + step, 1));
  }

  function cycleDay(date) {
    if (date.getDay() === 0 || date.getDay() === 6) return;
    const key = keyFor(date);
    const currentIndex = STATUS.indexOf(attendance?.[key]);
    onChange(key, STATUS[(currentIndex + 1) % STATUS.length]);
  }

  return (
    <View style={[styles.page, isDesktop && styles.pageDesktop]}>
      <View style={styles.hero}>
        <View>
          <Text style={styles.heroTitle}>{year} 年 {month + 1} 月</Text>
          <Text style={styles.heroHint}>点击日期标记，连续点击可切换状态 · {syncStatus === "error" ? "同步失败" : syncStatus === "loading" || syncStatus === "saving" ? "同步中…" : "已同步云端"}</Text>
        </View>
        <View style={styles.rateBlock}>
          <Text style={styles.rateValue}>{stats.rate}%</Text>
          <Text style={styles.rateLabel}>当前出勤率</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}><Text style={styles.metricValue}>{stats.expected}</Text><Text style={styles.metricLabel}>应出勤</Text></View>
        <View style={styles.metric}><Text style={[styles.metricValue, styles.presentText]}>{stats.present}</Text><Text style={styles.metricLabel}>已出勤</Text></View>
        <View style={styles.metric}><Text style={[styles.metricValue, styles.leaveText]}>{stats.leave}</Text><Text style={styles.metricLabel}>请假</Text></View>
        <View style={styles.metric}><Text style={[styles.metricValue, styles.absentText]}>{stats.absent}</Text><Text style={styles.metricLabel}>缺勤</Text></View>
      </View>

      <View style={styles.calendar}>
        <View style={styles.calendarHeader}>
          <Pressable onPress={() => moveMonth(-1)} style={styles.navButton}><Text style={styles.navText}>‹</Text></Pressable>
          <Text style={styles.monthTitle}>{year}.{String(month + 1).padStart(2, "0")}</Text>
          <Pressable onPress={() => moveMonth(1)} style={styles.navButton}><Text style={styles.navText}>›</Text></Pressable>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((day, index) => <Text key={day} style={[styles.weekday, index > 4 && styles.weekend]}>{day}</Text>)}
        </View>
        <View style={styles.daysGrid}>
          {days.map((date, index) => {
            const key = keyFor(date);
            const status = attendance?.[key];
            const isToday = key === keyFor(today);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isOutsideMonth = date.getMonth() !== month;
            return (
              <Pressable disabled={isWeekend || isOutsideMonth} key={`${key}-${index}`} onPress={() => cycleDay(date)} style={[styles.dayCell, isWeekend && !isOutsideMonth && styles.weekendCell, status && !isWeekend && styles[`${status}Cell`], isOutsideMonth && styles.outsideMonthCell, isToday && !isOutsideMonth && styles.todayCell]}>
                <Text style={[styles.dayNumber, isWeekend && !isOutsideMonth && styles.weekendNumber, status && !isWeekend && styles[`${status}Number`], isOutsideMonth && styles.outsideMonthNumber]}>{date.getDate()}</Text>
                {status && !isWeekend && <View style={[styles.statusDot, styles[`${status}Dot`]]} />}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}><View style={[styles.legendDot, styles.presentDot]} /><Text style={styles.legendText}>出勤</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, styles.leaveDot]} /><Text style={styles.legendText}>请假</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, styles.absentDot]} /><Text style={styles.legendText}>缺勤</Text></View>
          <Text style={styles.formula}>出勤率 = 已出勤工作日 ÷ 当月工作日</Text>
        </View>
      </View>
    </View>
  );
}
