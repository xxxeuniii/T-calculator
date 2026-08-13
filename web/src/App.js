import React, { useEffect, useMemo, useState } from "react";
import {
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";

import palette from "./styles/theme";
import styles from "./AppStyles";

import TradeCalculator from "./pages/TradeCalculator";
import ContractCalculator from "./pages/ContractCalculator";
import HistoryScreen from "./pages/HistoryScreen";
import KlineCountScreen from "./pages/KlineCountScreen";
import SessionHoursScreen from "./pages/SessionHoursScreen";
import ContractRoiScreen from "./pages/ContractRoiScreen";
import Mt5LiquidationScreen from "./pages/Mt5LiquidationScreen";
import AttendanceCalendar from "./pages/AttendanceCalendar";
import { fetchAttendanceMonth, saveAttendanceDate } from "./attendanceApi";

const screenOptions = [
  { label: "出勤日历", value: "attendance" },
  { label: "盘口时间", value: "sessions" },
  { label: "股票", value: "trade" },
  { label: "合约", value: "contract" },
  { label: "止盈止损", value: "contractRoi" },
  { label: "MT5强平价", value: "mt5Liquidation" },
  // { label: "数K线", value: "klineCount" }, // 暂时隐藏，功能还未完成
  { label: "历史", value: "history" },
];

function getScreenLabel(screen) {
  return screenOptions.find((item) => item.value === screen)?.label || "菜单";
}

export default function App() {
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && screenWidth >= 768;
  const [screen, setScreen] = useState("sessions");
  const [menuOpen, setMenuOpen] = useState(false);

  const loadHistory = () => {
    try {
      const saved = localStorage.getItem("tradeHistory");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const [history, setHistory] = useState(loadHistory);
  const [tradePrefill, setTradePrefill] = useState(null);
  const [contractPrefill, setContractPrefill] = useState(null);
  const [contractRoiPrefill, setContractRoiPrefill] = useState(null);
  const [mt5LiquidationPrefill, setMt5LiquidationPrefill] = useState(null);
  const [attendance, setAttendance] = useState(() => {
    try {
      const saved = localStorage.getItem("tradeAttendance");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [attendanceSync, setAttendanceSync] = useState("idle");

  async function loadAttendanceMonth(month) {
    setAttendanceSync("loading");
    try {
      const [year, monthNumber] = month.split("-").map(Number);
      const monthKeys = [-1, 0, 1].map((offset) => {
        const date = new Date(year, monthNumber - 1 + offset, 1);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      });
      const remoteMonths = await Promise.all(monthKeys.map(fetchAttendanceMonth));
      const remote = Object.assign({}, ...remoteMonths);
      let local = {};
      try {
        local = JSON.parse(localStorage.getItem("tradeAttendance") || "{}");
      } catch {
        local = {};
      }
      const missingLocalEntries = Object.entries(local).filter(
        ([key, status]) => monthKeys.some((item) => key.startsWith(`${item}-`)) && !remote[key] && status
      );
      if (missingLocalEntries.length > 0) {
        await Promise.all(missingLocalEntries.map(([date, status]) => saveAttendanceDate(date, status)));
      }
      const merged = { ...local, ...Object.fromEntries(missingLocalEntries), ...remote };
      localStorage.setItem("tradeAttendance", JSON.stringify(merged));
      setAttendance((current) => ({
        ...Object.fromEntries(Object.entries(current).filter(([key]) => !monthKeys.some((item) => key.startsWith(`${item}-`)))),
        ...Object.fromEntries(Object.entries(merged).filter(([key]) => monthKeys.some((item) => key.startsWith(`${item}-`)))),
      }));
      setAttendanceSync("synced");
    } catch (error) {
      console.error("Failed to load attendance", error);
      setAttendanceSync("error");
    }
  }

  async function updateAttendance(date, status) {
    setAttendance((current) => {
      const next = { ...current };
      if (status) next[date] = status;
      else delete next[date];
      localStorage.setItem("tradeAttendance", JSON.stringify(next));
      return next;
    });
    setAttendanceSync("saving");
    try {
      await saveAttendanceDate(date, status);
      setAttendanceSync("synced");
    } catch (error) {
      console.error("Failed to save attendance", error);
      setAttendanceSync("error");
    }
  }

  function addHistory(record) {
    const time = new Date().toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    setHistory((current) => {
      const newHistory = [
        {
          ...record,
          id: `${Date.now()}-${current.length}`,
          time,
        },
        ...current,
      ];
      localStorage.setItem("tradeHistory", JSON.stringify(newHistory));
      return newHistory;
    });
  }

  function chooseScreen(value) {
    setScreen(value);
    setMenuOpen(false);
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem("tradeHistory");
  }

  function selectHistory(item) {
    if (item.screen === "trade") {
      setTradePrefill({ id: item.id, mode: item.mode, form: item.form });
      setScreen("trade");
      return;
    }

    if (item.screen === "contract") {
      setContractPrefill({ id: item.id, side: item.side, form: item.form });
      setScreen("contract");
      return;
    }

    if (item.screen === "contractRoi") {
      setContractRoiPrefill({ id: item.id, side: item.side, form: item.form });
      setScreen("contractRoi");
      return;
    }

    if (item.screen === "mt5Liquidation") {
      setMt5LiquidationPrefill({ id: item.id, side: item.side, form: item.form });
      setScreen("mt5Liquidation");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.paper} />
      <View style={styles.appHeader}>
        <Pressable onPress={() => setMenuOpen((open) => !open)} style={styles.menuButton}>
          <Text style={styles.menuIcon}>☰</Text>
        </Pressable>
        <Text style={styles.screenTitle}>{getScreenLabel(screen)}</Text>
        <View style={styles.headerSpacer} />

        {menuOpen && (
          <View style={styles.menuPanel}>
            {screenOptions.map((item) => {
              const active = screen === item.value;
              return (
                <Pressable key={item.value} onPress={() => chooseScreen(item.value)} style={[styles.menuItem, active && styles.menuItemActive]}>
                  <Text style={[styles.menuItemText, active && styles.menuItemTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={{
            flexDirection: isDesktop ? "row" : "column",
            gap: isDesktop ? 24 : 0,
            paddingHorizontal: isDesktop ? "4%" : 0,
            paddingTop: isDesktop ? 24 : 0,
            justifyContent: isDesktop ? "center" : "flex-start",
            maxWidth: isDesktop ? 900 : "100%",
            marginLeft: isDesktop ? "auto" : 0,
            marginRight: isDesktop ? "auto" : 0,
          }}>
            {screen === "trade" && <TradeCalculator addHistory={addHistory} prefill={tradePrefill} isDesktop={isDesktop} />}
            {screen === "contract" && <ContractCalculator addHistory={addHistory} prefill={contractPrefill} isDesktop={isDesktop} />}
            {screen === "contractRoi" && <ContractRoiScreen addHistory={addHistory} prefill={contractRoiPrefill} isDesktop={isDesktop} />}
            {screen === "mt5Liquidation" && <Mt5LiquidationScreen addHistory={addHistory} prefill={mt5LiquidationPrefill} isDesktop={isDesktop} />}
            {/* {screen === "klineCount" && <KlineCountScreen isDesktop={isDesktop} />} 暂时隐藏，功能还未完成 */}
            {screen === "sessions" && <SessionHoursScreen isDesktop={isDesktop} />}
            {screen === "attendance" && <AttendanceCalendar attendance={attendance} onChange={updateAttendance} onMonthChange={loadAttendanceMonth} syncStatus={attendanceSync} isDesktop={isDesktop} />}
            {screen === "history" && <HistoryScreen history={history} onClear={clearHistory} onSelect={selectHistory} />}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
