import React, { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import styles from "../styles";

/** 常用外汇/加密盘口对照（北京时间），冬夏令时影响欧盘、美盘开收时间。 */
const SESSIONS = [
  {
    id: "asia",
    name: "亚盘",
    markets: "悉尼 / 东京",
    openWinter: "06:00",
    closeWinter: "14:00",
    openSummer: "06:00",
    closeSummer: "14:00",
    note: "悉尼约 06:00 启动，东京约 08:00 进入主力时段。",
    tone: "asia",
  },
  {
    id: "europe",
    name: "欧盘",
    markets: "法兰克福 / 伦敦",
    openWinter: "15:00",
    closeWinter: "00:00",
    openSummer: "14:00",
    closeSummer: "23:00",
    note: "伦敦开盘：冬季约 16:00，夏季约 15:00（受英国夏令时影响）。",
    tone: "europe",
  },
  {
    id: "america",
    name: "美盘",
    markets: "纽约",
    openWinter: "21:00",
    closeWinter: "05:00",
    openSummer: "20:00",
    closeSummer: "04:00",
    note: "纽约开盘：冬季约 21:00，夏季约 20:00；与欧盘重叠时段往往波动更大。",
    tone: "america",
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
    weekday: "short",
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

/** 粗判北半球是否处于夏令时窗口（3月中旬～11月初），用于欧盘/美盘展示。 */
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

function isSessionActive(openHm, closeHm, minutesOfDay) {
  const open = parseHm(openHm);
  const close = parseHm(closeHm);
  if (open === close) return true;
  if (open < close) {
    return minutesOfDay >= open && minutesOfDay < close;
  }
  return minutesOfDay >= open || minutesOfDay < close;
}

const toneStyles = {
  asia: {
    card: styles.sessionCardAsia,
    badge: styles.sessionBadgeAsia,
    badgeText: styles.sessionBadgeTextAsia,
  },
  europe: {
    card: styles.sessionCardEurope,
    badge: styles.sessionBadgeEurope,
    badgeText: styles.sessionBadgeTextEurope,
  },
  america: {
    card: styles.sessionCardAmerica,
    badge: styles.sessionBadgeAmerica,
    badgeText: styles.sessionBadgeTextAmerica,
  },
};

export default function SessionHoursScreen({ isDesktop }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const beijing = useMemo(() => getBeijingParts(now), [now]);
  const summer = useMemo(() => isNorthernSummer(beijing), [beijing]);
  const seasonLabel = summer ? "夏令时对照" : "冬令时对照";

  const rows = useMemo(
    () =>
      SESSIONS.map((session) => {
        const open = summer ? session.openSummer : session.openWinter;
        const close = summer ? session.closeSummer : session.closeWinter;
        const active = isSessionActive(open, close, beijing.minutesOfDay);
        return { ...session, open, close, active };
      }),
    [beijing.minutesOfDay, summer]
  );

  const activeNames = rows.filter((item) => item.active).map((item) => item.name);
  const statusText = activeNames.length ? `当前开盘：${activeNames.join("、")}` : "当前为盘口切换空隙";

  return (
    <View style={[styles.sessionContainer, { paddingHorizontal: isDesktop ? "8%" : 12, width: "100%" }]}>
      <View style={styles.sessionNowBar}>
        <Text style={styles.sessionNowLabel}>北京时间</Text>
        <Text style={styles.sessionNowValue}>{beijing.label}</Text>
        <Text style={styles.sessionNowStatus}>{statusText}</Text>
        <Text style={styles.sessionSeason}>{seasonLabel}</Text>
      </View>

      <View style={isDesktop ? styles.sessionGridDesktop : styles.sessionGrid}>
        {rows.map((session) => {
          const tone = toneStyles[session.tone];
          return (
            <View
              key={session.id}
              style={[styles.sessionCard, tone.card, isDesktop && styles.sessionCardDesktop, session.active && styles.sessionCardActive]}
            >
              <View style={styles.sessionCardTop}>
                <View>
                  <Text style={styles.sessionName}>{session.name}</Text>
                  <Text style={styles.sessionMarkets}>{session.markets}</Text>
                </View>
                <View style={[styles.sessionBadge, tone.badge, session.active && styles.sessionBadgeActive]}>
                  <Text style={[styles.sessionBadgeText, tone.badgeText, session.active && styles.sessionBadgeTextActive]}>
                    {session.active ? "开盘中" : "未开盘"}
                  </Text>
                </View>
              </View>

              <View style={styles.sessionTimeRow}>
                <View style={styles.sessionTimeBlock}>
                  <Text style={styles.sessionTimeLabel}>开盘</Text>
                  <Text style={styles.sessionTimeValue}>{session.open}</Text>
                </View>
                <Text style={styles.sessionTimeSep}>→</Text>
                <View style={styles.sessionTimeBlock}>
                  <Text style={styles.sessionTimeLabel}>收盘</Text>
                  <Text style={styles.sessionTimeValue}>{session.close}</Text>
                </View>
              </View>

              <Text style={styles.sessionNote}>{session.note}</Text>

              <View style={styles.sessionDstRow}>
                <Text style={styles.sessionDstText}>
                  冬季 {session.openWinter}-{session.closeWinter}
                </Text>
                <Text style={styles.sessionDstText}>
                  夏季 {session.openSummer}-{session.closeSummer}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.sessionFooter}>时间为北京时间（UTC+8）。欧盘、美盘会受夏令时影响，切换时以当地开市为准。</Text>
    </View>
  );
}
