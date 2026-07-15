import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import styles from "../styles";

/**
 * 盘口时段（北京时间）。
 * 亚盘按中日韩股市；美盘按纽约，区分冬夏令时。
 * indexNote：旁边注解，说明指数一般看哪个。
 */
const MARKETS = [
  {
    id: "china",
    session: "asia",
    name: "中国",
    indexNote: "看上证综指 000001",
    region: "亚盘",
    tone: "asia",
    hasDst: false,
    phasesWinter: [
      { key: "auctionOpen", label: "集合竞价", start: "09:15", end: "09:25", hint: "开盘·定开盘价" },
      { key: "preOpen", label: "等待开盘", start: "09:25", end: "09:30", hint: "可挂撤·不撮合" },
      { key: "openAm", label: "连续竞价", start: "09:30", end: "11:30", hint: "上午" },
      { key: "break", label: "休盘", start: "11:30", end: "13:00" },
      { key: "openPm", label: "连续竞价", start: "13:00", end: "14:57", hint: "下午" },
      { key: "auctionClose", label: "集合竞价", start: "14:57", end: "15:00", hint: "收盘·定收盘价" },
      { key: "after", label: "盘后", start: "15:05", end: "15:30", hint: "固价交易" },
    ],
  },
  {
    id: "japan",
    session: "asia",
    name: "日本",
    indexNote: "看日经225",
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
    indexNote: "看 KOSPI",
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
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const map = Object.fromEntries(parts.filter((item) => item.type !== "literal").map((item) => [item.type, item.value]));
  const hour = Number(map.hour === "24" ? "0" : map.hour);
  const minute = Number(map.minute);
  const second = Number(map.second);

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute,
    second,
    minutesOfDay: hour * 60 + minute,
    secondsOfDay: hour * 3600 + minute * 60 + second,
    label: `${map.year}-${map.month}-${map.day} ${pad2(hour)}:${pad2(minute)}:${pad2(second)}`,
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

/** 当前时段已进行比例 0–1（支持跨日，如美盘 21:30–04:00） */
function getPhaseProgress(startHm, endHm, secondsOfDay) {
  const start = parseHm(startHm) * 60;
  const end = parseHm(endHm) * 60;
  const day = 24 * 3600;

  let duration;
  let elapsed;
  if (start === end) {
    return 0;
  }
  if (start < end) {
    duration = end - start;
    elapsed = secondsOfDay - start;
  } else {
    duration = day - start + end;
    elapsed = secondsOfDay >= start ? secondsOfDay - start : day - start + secondsOfDay;
  }

  if (duration <= 0) return 0;
  return Math.max(0, Math.min(1, elapsed / duration));
}

function getSecondsRemainingInPhase(startHm, endHm, secondsOfDay) {
  const start = parseHm(startHm) * 60;
  const end = parseHm(endHm) * 60;
  const day = 24 * 3600;
  if (start === end) return 0;
  if (start < end) {
    return Math.max(0, end - secondsOfDay);
  }
  if (secondsOfDay >= start) {
    return day - secondsOfDay + end;
  }
  return Math.max(0, end - secondsOfDay);
}

function getSecondsUntilStart(startHm, secondsOfDay) {
  const start = parseHm(startHm) * 60;
  const day = 24 * 3600;
  if (secondsOfDay <= start) return start - secondsOfDay;
  return day - secondsOfDay + start;
}

function formatCountdown(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}小时${pad2(m)}分${pad2(sec)}秒`;
  if (m > 0) return `${m}分${pad2(sec)}秒`;
  return `${sec}秒`;
}

function getPhaseCountdown(phase, minutesOfDay, secondsOfDay) {
  if (isInRange(phase.start, phase.end, minutesOfDay)) {
    const seconds = getSecondsRemainingInPhase(phase.start, phase.end, secondsOfDay);
    return { state: "current", seconds, caption: "剩余", text: formatCountdown(seconds) };
  }
  const seconds = getSecondsUntilStart(phase.start, secondsOfDay);
  return { state: "upcoming", seconds, caption: "还有", text: formatCountdown(seconds) };
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
  集合竞价: styles.phaseChipAuction,
  等待开盘: styles.phaseChipWait,
  连续竞价: styles.phaseChipOpen,
  盘中: styles.phaseChipOpen,
  休盘: styles.phaseChipBreak,
  盘后: styles.phaseChipAfter,
};

export default function SessionHoursScreen({ isDesktop }) {
  const [now, setNow] = useState(() => new Date());
  const [countdownMarketId, setCountdownMarketId] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const beijing = useMemo(() => getBeijingParts(now), [now]);
  const summer = useMemo(() => isNorthernSummer(beijing), [beijing]);

  const rows = useMemo(() => {
    const list = MARKETS.map((market, index) => {
      const phases = getPhases(market, summer);
      const current = getCurrentPhase(phases, beijing.minutesOfDay);
      const progress =
        current != null ? getPhaseProgress(current.start, current.end, beijing.secondsOfDay) : 0;
      const countdowns = phases.map((phase) => ({
        phase,
        ...getPhaseCountdown(phase, beijing.minutesOfDay, beijing.secondsOfDay),
      }));
      return {
        ...market,
        phases,
        current,
        progress,
        countdowns,
        status: getStatusLabel(current),
        active: Boolean(current),
        order: index,
      };
    });

    // 当前开着的市场置顶，同组内保持原顺序
    return list.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return a.order - b.order;
    });
  }, [beijing.minutesOfDay, beijing.secondsOfDay, summer]);

  const countdownMarket = rows.find((item) => item.id === countdownMarketId) || null;

  return (
    <View style={[styles.sessionContainer, { paddingHorizontal: isDesktop ? "8%" : 12, width: "100%" }]}>
      <View style={styles.sessionNowBar}>
        <Text style={styles.sessionNowLabel}>北京时间</Text>
        <Text style={styles.sessionNowValue}>{beijing.label}</Text>
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
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.sessionName}>
                    {market.region} · {market.name}
                  </Text>
                  {market.indexNote ? <Text style={styles.sessionIndexNote}>{market.indexNote}</Text> : null}
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
                  const progressPct = isCurrent ? Math.round(market.progress * 1000) / 10 : 0;
                  return (
                    <View key={`${market.id}-${phase.key}`} style={[styles.phaseRow, isCurrent && styles.phaseRowActive]}>
                      {isCurrent ? (
                        <View pointerEvents="none" style={[styles.phaseProgressFill, { width: `${progressPct}%` }]} />
                      ) : null}
                      <View style={styles.phaseRowInner}>
                        <View style={[styles.phaseChip, phaseTone[phase.label], isCurrent && styles.phaseChipActive]}>
                          <Text style={[styles.phaseChipText, isCurrent && styles.phaseChipTextActive]}>{phase.label}</Text>
                        </View>
                        <View style={styles.phaseMain}>
                          <Text style={[styles.phaseTime, isCurrent && styles.phaseTimeActive]}>
                            {phase.start} – {phase.end}
                          </Text>
                          {phase.hint ? <Text style={styles.phaseHint}>{phase.hint}</Text> : null}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={styles.sessionCardFooter}>
                {market.hasDst ? (
                  <Text style={styles.sessionDstText}>冬令时 / 夏令时自动切换</Text>
                ) : (
                  <View style={{ flex: 1 }} />
                )}
                <Pressable
                  onPress={() => setCountdownMarketId(market.id)}
                  style={styles.sessionCountdownEntry}
                  accessibilityRole="button"
                  accessibilityLabel="查看倒计时"
                >
                  <Text style={styles.sessionCountdownEntryText}>倒计时</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.sessionFooter}>
        时间为北京时间（UTC+8）。中国含开盘/收盘集合竞价与等待开盘；韩国无午间休盘；美股盘中连续交易，休盘为隔夜闭市，开收受夏令时影响。
      </Text>

      <Modal visible={Boolean(countdownMarket)} transparent animationType="fade" onRequestClose={() => setCountdownMarketId(null)}>
        <View style={styles.countdownOverlay}>
          <Pressable style={styles.countdownBackdrop} onPress={() => setCountdownMarketId(null)} />
          {countdownMarket ? (
            <View style={styles.countdownSheet}>
              <View style={styles.countdownHeader}>
                <Text style={styles.countdownTitle}>
                  {countdownMarket.region} · {countdownMarket.name}
                </Text>
                <Pressable onPress={() => setCountdownMarketId(null)} style={styles.countdownCloseBtn}>
                  <Text style={styles.countdownCloseText}>关闭</Text>
                </Pressable>
              </View>
              <Text style={styles.countdownSub}>距离各时段还有多久（北京时间）</Text>
              <View style={styles.countdownList}>
                {countdownMarket.countdowns.map((item) => (
                  <View
                    key={`${countdownMarket.id}-${item.phase.key}-cd`}
                    style={[styles.countdownRow, item.state === "current" && styles.countdownRowCurrent]}
                  >
                    <View style={styles.countdownRowLeft}>
                      <Text style={styles.countdownPhaseLabel}>
                        {item.phase.label}
                        {item.phase.hint ? ` · ${item.phase.hint}` : ""}
                      </Text>
                      <Text style={styles.countdownPhaseRange}>
                        {item.phase.start} – {item.phase.end}
                      </Text>
                    </View>
                    <View style={styles.countdownRowRight}>
                      <Text style={styles.countdownCaption}>{item.state === "current" ? "剩余" : "还有"}</Text>
                      <Text style={[styles.countdownValue, item.state === "current" && styles.countdownValueCurrent]}>
                        {item.text}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
