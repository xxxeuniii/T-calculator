import React, { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import styles from "../styles";

/**
 * 盘口时段（北京时间）。
 * 亚盘按日韩中股市；美盘按纽约，区分冬夏令时。
 */
const MARKETS = [
  {
    id: "china",
    session: "asia",
    name: "中国",
    region: "亚盘",
    tone: "asia",
    hasDst: false,
    phasesWinter: [
      { key: "pre", label: "盘前", start: "09:15", end: "09:25" },
      { key: "openAm", label: "盘中", start: "09:30", end: "11:30", hint: "上午" },
      { key: "break", label: "休盘", start: "11:30", end: "13:00" },
      { key: "openPm", label: "盘中", start: "13:00", end: "15:00", hint: "下午" },
      { key: "after", label: "盘后", start: "15:05", end: "15:30" },
    ],
  },
  {
    id: "japan",
    session: "asia",
    name: "日本",
    region: "亚盘",
    tone: "asia",
    hasDst: false,
    phasesWinter: [
      { key: "pre", label: "盘前", start: "07:00", end: "08:00" },
      { key: "openAm", label: "盘中", start: "08:00", end: "10:30", hint: "上午" },
      { key: "break", label: "休盘", start: "10:30", end: "11:30" },
      { key: "openPm", label: "盘中", start: "11:30", end: "14:00", hint: "下午" },
      { key: "after", label: "盘后", start: "14:00", end: "15:00" },
    ],
  },
  {
    id: "korea",
    session: "asia",
    name: "韩国",
    region: "亚盘",
    tone: "asia",
    hasDst: false,
    phasesWinter: [
      { key: "pre", label: "盘前", start: "07:30", end: "08:00" },
      { key: "open", label: "盘中", start: "08:00", end: "14:30", hint: "连续竞价" },
      { key: "after", label: "盘后", start: "14:30", end: "15:30" },
    ],
  },
  {
    id: "us",
    session: "america",
    name: "美国",
    region: "美盘",
    tone: "america",
    hasDst: true,
    phasesWinter: [
      { key: "pre", label: "盘前", start: "17:00", end: "22:30" },
      { key: "open", label: "盘中", start: "22:30", end: "05:00" },
      { key: "after", label: "盘后", start: "05:00", end: "09:00" },
      { key: "break", label: "休盘", start: "09:00", end: "17:00", hint: "隔夜闭市" },
    ],
    phasesSummer: [
      { key: "pre", label: "盘前", start: "16:00", end: "21:30" },
      { key: "open", label: "盘中", start: "21:30", end: "04:00" },
      { key: "after", label: "盘后", start: "04:00", end: "08:00" },
      { key: "break", label: "休盘", start: "08:00", end: "16:00", hint: "隔夜闭市" },
    ],
  },
];

function pad2(value) {
  return String(value).padStart(2, "0");
}

function getBeijingParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const map = Object.fromEntries(parts.filter((item) => item.type !== "literal").map((item) => [item.type, item.value]));
  const hour = Number(map.hour === "24" ? "0" : map.hour);
  const minute = Number(map.minute);

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute,
    minutesOfDay: hour * 60 + minute,
    label: `${map.year}-${map.month}-${map.day} ${pad2(hour)}:${pad2(minute)}`,
  };
}

function isNorthernSummer(beijing) {
  const month = beijing.month;
  const day = beijing.day;
  if (month > 3 && month < 11) return true;
  if (month === 3 && day >= 10) return true;
  if (month === 11 && day <= 6) return true;
  return false;
}

function parseHm(value) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function isInRange(startHm, endHm, minutesOfDay) {
  const start = parseHm(startHm);
  const end = parseHm(endHm);
  if (start === end) return true;
  if (start < end) {
    return minutesOfDay >= start && minutesOfDay < end;
  }
  return minutesOfDay >= start || minutesOfDay < end;
}

function getPhases(market, summer) {
  if (market.hasDst && summer && market.phasesSummer) {
    return market.phasesSummer;
  }
  return market.phasesWinter;
}

function getCurrentPhase(phases, minutesOfDay) {
  return phases.find((phase) => isInRange(phase.start, phase.end, minutesOfDay)) || null;
}

function getStatusLabel(phase) {
  if (!phase) return "闭市";
  return phase.label;
}

const toneStyles = {
  asia: {
    card: styles.sessionCardAsia,
    badge: styles.sessionBadgeAsia,
    badgeText: styles.sessionBadgeTextAsia,
  },
  america: {
    card: styles.sessionCardAmerica,
    badge: styles.sessionBadgeAmerica,
    badgeText: styles.sessionBadgeTextAmerica,
  },
};

const phaseTone = {
  盘前: styles.phaseChipPre,
  盘中: styles.phaseChipOpen,
  休盘: styles.phaseChipBreak,
  盘后: styles.phaseChipAfter,
};

export default function SessionHoursScreen({ isDesktop }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const beijing = useMemo(() => getBeijingParts(now), [now]);
  const summer = useMemo(() => isNorthernSummer(beijing), [beijing]);

  const rows = useMemo(
    () =>
      MARKETS.map((market) => {
        const phases = getPhases(market, summer);
        const current = getCurrentPhase(phases, beijing.minutesOfDay);
        return {
          ...market,
          phases,
          current,
          status: getStatusLabel(current),
          active: Boolean(current),
        };
      }),
    [beijing.minutesOfDay, summer]
  );

  const activeSummary = rows
    .filter((item) => item.current)
    .map((item) => `${item.name}${item.status}`)
    .join("、");
  const statusText = activeSummary || "当前各市场均为闭市";

  return (
    <View style={[styles.sessionContainer, { paddingHorizontal: isDesktop ? "8%" : 12, width: "100%" }]}>
      <View style={styles.sessionNowBar}>
        <Text style={styles.sessionNowLabel}>北京时间</Text>
        <Text style={styles.sessionNowValue}>{beijing.label}</Text>
        <Text style={styles.sessionNowStatus}>{statusText}</Text>
        <Text style={styles.sessionSeason}>{summer ? "美盘按夏令时" : "美盘按冬令时"}</Text>
      </View>

      <View style={isDesktop ? styles.sessionGridDesktop : styles.sessionGrid}>
        {rows.map((market) => {
          const tone = toneStyles[market.tone];
          return (
            <View
              key={market.id}
              style={[styles.sessionCard, tone.card, isDesktop && styles.sessionCardDesktop, market.active && styles.sessionCardActive]}
            >
              <View style={styles.sessionCardTop}>
                <View>
                  <Text style={styles.sessionName}>
                    {market.region} · {market.name}
                  </Text>
                </View>
                <View style={[styles.sessionBadge, tone.badge, market.active && styles.sessionBadgeActive]}>
                  <Text style={[styles.sessionBadgeText, tone.badgeText, market.active && styles.sessionBadgeTextActive]}>
                    {market.status}
                  </Text>
                </View>
              </View>

              <View style={styles.phaseList}>
                {market.phases.map((phase) => {
                  const isCurrent = market.current?.key === phase.key;
                  return (
                    <View key={`${market.id}-${phase.key}`} style={[styles.phaseRow, isCurrent && styles.phaseRowActive]}>
                      <View style={[styles.phaseChip, phaseTone[phase.label], isCurrent && styles.phaseChipActive]}>
                        <Text style={[styles.phaseChipText, isCurrent && styles.phaseChipTextActive]}>{phase.label}</Text>
                      </View>
                      <View style={styles.phaseMain}>
                        <Text style={[styles.phaseTime, isCurrent && styles.phaseTimeActive]}>
                          {phase.start} – {phase.end}
                        </Text>
                        {phase.hint ? <Text style={styles.phaseHint}>{phase.hint}</Text> : null}
                      </View>
                      {isCurrent ? <Text style={styles.phaseNowTag}>当前</Text> : null}
                    </View>
                  );
                })}
              </View>

              {market.hasDst ? (
                <View style={styles.sessionDstRow}>
                  <Text style={styles.sessionDstText}>冬令时 / 夏令时自动切换</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <Text style={styles.sessionFooter}>
        时间为北京时间（UTC+8）。韩国无午间休盘；美股盘中连续交易，休盘为盘后到次日盘前的隔夜闭市，开收受夏令时影响。
      </Text>
    </View>
  );
}
