import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const { calculateTrade, calculateTrailingContract } = require("./calculator");

const palette = {
  ink: "#17211a",
  muted: "#677267",
  paper: "#f7f2e2",
  panel: "#fffdf5",
  line: "#d9d1bc",
  accent: "#0f7b55",
  accentStrong: "#075f41",
  lossBg: "#963333",
};

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdtFormatter = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const priceFormatter = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

function formatCurrency(value) {
  return value === null || value === undefined ? "--" : currencyFormatter.format(value);
}

function formatPrice(value, unit = "元/股") {
  return value === null || value === undefined ? "--" : `${priceFormatter.format(value)} ${unit}`;
}

function formatUsdt(value) {
  return value === null || value === undefined ? "--" : `${usdtFormatter.format(value)} USDT`;
}

function getTradeModeText(mode) {
  if (mode === "reverse") {
    return {
      netLabel: "本次反T净收益",
      sellLabel: "反T卖出价",
      buyLabel: "反T买入价",
      emptyFormula: "反T净收益 = (反T卖出价 - 反T买入价) × 做T股数 - 买卖佣金 - 印花税",
      actionText: "反T：先买入，后卖出",
    };
  }

  return {
    netLabel: "本次正T净收益",
    sellLabel: "做T卖出价",
    buyLabel: "接回价",
    emptyFormula: "正T净收益 = (做T卖出价 - 接回价) × 做T股数 - 买卖佣金 - 印花税",
    actionText: "正T：先卖出，后接回",
  };
}

function Field({ label, value, onChangeText, keyboardType = "decimal-pad" }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        inputMode="decimal"
        style={styles.input}
        selectionColor={palette.accent}
      />
    </View>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function Segment({ items, value, onChange }) {
  return (
    <View style={styles.segment}>
      {items.map((item) => {
        const active = value === item.value;
        return (
          <Pressable key={item.value} onPress={() => onChange(item.value)} style={[styles.segmentItem, active && styles.segmentItemActive]}>
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TradeCalculator({ addHistory }) {
  const [mode, setMode] = useState("positive");
  const [form, setForm] = useState({
    costPrice: "",
    totalShares: "",
    tradeShares: "",
    sellPrice: "",
    buyPrice: "",
  });

  const modeText = getTradeModeText(mode);
  const result = useMemo(() => calculateTrade(form), [form]);
  const formulaText = result
    ? `(${priceFormatter.format(Number(form.sellPrice))} - ${priceFormatter.format(Number(form.buyPrice))}) × ${Number(
        form.tradeShares
      )} - ${formatCurrency(result.totalCommission)}佣金 - ${formatCurrency(result.stampTax)}印花税 = ${formatCurrency(
        result.netProfit
      )}。 ${modeText.actionText}，卖出金额收印花税。`
    : modeText.emptyFormula;

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function clearForm() {
    setForm({
      costPrice: "",
      totalShares: "",
      tradeShares: "",
      sellPrice: "",
      buyPrice: "",
    });
  }

  function saveTrade() {
    if (!result) return;
    addHistory({
      type: "做T",
      title: mode === "positive" ? "正T" : "反T",
      summary: `${modeText.netLabel} ${formatCurrency(result.netProfit)}`,
      detail: `${modeText.sellLabel} ${form.sellPrice}，${modeText.buyLabel} ${form.buyPrice}，做T股数 ${form.tradeShares}`,
    });
  }

  return (
    <>
      <View style={styles.panel}>
        <View style={styles.topRow}>
          <Segment
            value={mode}
            onChange={setMode}
            items={[
              { label: "正T", value: "positive" },
              { label: "反T", value: "reverse" },
            ]}
          />
          <Pressable onPress={clearForm} style={styles.clearButton}>
            <Text style={styles.clearText}>清空</Text>
          </Pressable>
        </View>

        <View style={styles.fieldGrid}>
          <Field label="持仓成本价" value={form.costPrice} onChangeText={(value) => updateField("costPrice", value)} />
          <Field label="持仓股数" value={form.totalShares} onChangeText={(value) => updateField("totalShares", value)} keyboardType="number-pad" />
          <Field label="做T股数" value={form.tradeShares} onChangeText={(value) => updateField("tradeShares", value)} keyboardType="number-pad" />
          {mode === "reverse" ? (
            <>
              <Field label={modeText.buyLabel} value={form.buyPrice} onChangeText={(value) => updateField("buyPrice", value)} />
              <Field label={modeText.sellLabel} value={form.sellPrice} onChangeText={(value) => updateField("sellPrice", value)} />
            </>
          ) : (
            <>
              <Field label={modeText.sellLabel} value={form.sellPrice} onChangeText={(value) => updateField("sellPrice", value)} />
              <Field label={modeText.buyLabel} value={form.buyPrice} onChangeText={(value) => updateField("buyPrice", value)} />
            </>
          )}
        </View>

        <View style={styles.feeRow}>
          <Text style={styles.feeChip}>佣金：万三，买卖双向，单笔最低 5 元</Text>
          <Text style={styles.feeChip}>印花税：卖出金额的 0.05%</Text>
        </View>
      </View>

      <View style={styles.resultPanel}>
        <View style={[styles.primaryResult, result && !result.isGain && styles.primaryLoss]}>
          <Text style={styles.primaryLabel}>{modeText.netLabel}</Text>
          <Text style={styles.primaryValue}>{formatCurrency(result?.netProfit)}</Text>
        </View>

        <View style={styles.metrics}>
          <Metric label="价差收益" value={formatCurrency(result?.spreadProfit)} />
          <Metric label="总佣金" value={formatCurrency(result?.totalCommission)} />
          <Metric label="卖出佣金" value={formatCurrency(result?.sellCommission)} />
          <Metric label="买入佣金" value={formatCurrency(result?.buyCommission)} />
          <Metric label="印花税" value={formatCurrency(result?.stampTax)} />
          <Metric label="做T后新成本价" value={result ? formatPrice(result.newCostPrice) : "--"} />
          <Metric label="成本降低" value={result ? formatPrice(result.costReduction) : "--"} />
        </View>

        <Text style={styles.formula}>{formulaText}</Text>
        <Pressable onPress={saveTrade} style={[styles.confirmButton, !result && styles.disabledButton]}>
          <Text style={styles.confirmText}>确认并存入历史</Text>
        </Pressable>
      </View>
    </>
  );
}

function ContractCalculator({ addHistory }) {
  const [side, setSide] = useState("long");
  const [form, setForm] = useState({
    callbackRate: "",
    quantity: "",
    activationPrice: "",
  });

  const result = useMemo(() => calculateTrailingContract({ ...form, side }), [form, side]);
  const sideText = side === "long" ? "做多" : "做空";
  const description = result
    ? side === "long"
      ? `价格到达激活价后，从高点回撤 ${result.callbackRate}% 时，预计止盈触发价约为 ${formatUsdt(result.expectedPrice)}。`
      : `价格到达激活价后，从低点反弹 ${result.callbackRate}% 时，预计止盈触发价约为 ${formatUsdt(result.expectedPrice)}。`
    : "输入回调率和激活价格后，自动计算移动止盈/止损的预计触发价。";

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function quickRate(value) {
    updateField("callbackRate", value);
  }

  function clearForm() {
    setForm({ callbackRate: "", quantity: "", activationPrice: "" });
  }

  function saveContract() {
    if (!result) return;
    addHistory({
      type: "合约",
      title: `${sideText} 跟踪委托`,
      summary: `预计止盈价 ${formatUsdt(result.expectedPrice)}`,
      detail: `激活价 ${formatUsdt(result.activationPrice)}，回调率 ${result.callbackRate}%，数量 ${form.quantity || "--"} USDT`,
    });
  }

  return (
    <>
      <View style={styles.panel}>
        <View style={styles.topRow}>
          <Segment
            value={side}
            onChange={setSide}
            items={[
              { label: "做多", value: "long" },
              { label: "做空", value: "short" },
            ]}
          />
          <Pressable onPress={clearForm} style={styles.clearButton}>
            <Text style={styles.clearText}>清空</Text>
          </Pressable>
        </View>

        <View style={styles.fieldGrid}>
          <Field label="回调率（%）" value={form.callbackRate} onChangeText={(value) => updateField("callbackRate", value)} />
          <View style={styles.quickRates}>
            {["0.1", "1", "5", "10"].map((rate) => (
              <Pressable key={rate} onPress={() => quickRate(rate)} style={styles.quickRate}>
                <Text style={styles.quickRateText}>{rate}%</Text>
              </Pressable>
            ))}
          </View>
          <Field label="数量（USDT）" value={form.quantity} onChangeText={(value) => updateField("quantity", value)} />
          <Field label="激活价格（USDT）" value={form.activationPrice} onChangeText={(value) => updateField("activationPrice", value)} />
        </View>

        <View style={styles.feeRow}>
          <Text style={styles.feeChip}>移动止盈止损</Text>
          <Text style={styles.feeChip}>预计价按激活价和回调率估算</Text>
        </View>
      </View>

      <View style={styles.resultPanel}>
        <View style={styles.primaryResult}>
          <Text style={styles.primaryLabel}>预计止盈价</Text>
          <Text style={styles.primaryValue}>{result ? formatUsdt(result.expectedPrice) : "--"}</Text>
        </View>

        <View style={styles.metrics}>
          <Metric label="方向" value={sideText} />
          <Metric label="激活价格" value={result ? formatUsdt(result.activationPrice) : "--"} />
          <Metric label="回调率" value={result ? `${result.callbackRate}%` : "--"} />
          <Metric label="回调价差" value={result ? formatUsdt(result.callbackAmount) : "--"} />
          <Metric label="数量" value={form.quantity ? `${form.quantity} USDT` : "--"} />
        </View>

        <Text style={styles.formula}>{description}</Text>
        <Pressable onPress={saveContract} style={[styles.confirmButton, !result && styles.disabledButton]}>
          <Text style={styles.confirmText}>确认并存入历史</Text>
        </Pressable>
      </View>
    </>
  );
}

function HistoryScreen({ history, clearHistory }) {
  return (
    <View style={styles.resultPanel}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>历史记录</Text>
        <Pressable onPress={clearHistory} style={styles.clearButton}>
          <Text style={styles.clearText}>清空</Text>
        </Pressable>
      </View>

      {history.length === 0 ? (
        <Text style={styles.emptyText}>还没有记录。做T或合约页点“确认并存入历史”后会出现在这里。</Text>
      ) : (
        history.map((item) => (
          <View key={item.id} style={styles.historyItem}>
            <View style={styles.historyItemTop}>
              <Text style={styles.historyType}>{item.type}</Text>
              <Text style={styles.historyTime}>{item.time}</Text>
            </View>
            <Text style={styles.historyName}>{item.title}</Text>
            <Text style={styles.historySummary}>{item.summary}</Text>
            <Text style={styles.historyDetail}>{item.detail}</Text>
          </View>
        ))
      )}
    </View>
  );
}

export default function App() {
  const [screen, setScreen] = useState("trade");
  const [history, setHistory] = useState([]);

  function addHistory(record) {
    const time = new Date().toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    setHistory((current) => [
      {
        ...record,
        id: `${Date.now()}-${current.length}`,
        time,
      },
      ...current,
    ]);
    setScreen("history");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.paper} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.menuBar}>
            <Segment
              value={screen}
              onChange={setScreen}
              items={[
                { label: "做T", value: "trade" },
                { label: "合约", value: "contract" },
                { label: "历史", value: "history" },
              ]}
            />
          </View>

          {screen === "trade" && <TradeCalculator addHistory={addHistory} />}
          {screen === "contract" && <ContractCalculator addHistory={addHistory} />}
          {screen === "history" && <HistoryScreen history={history} clearHistory={() => setHistory([])} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.paper,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  menuBar: {
    alignItems: "center",
  },
  panel: {
    borderWidth: 1,
    borderColor: "rgba(86, 97, 73, 0.2)",
    borderRadius: 8,
    backgroundColor: "rgba(255, 253, 245, 0.94)",
    padding: 16,
    shadowColor: "#2d3625",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 3,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  segment: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "rgba(217, 209, 188, 0.86)",
    borderRadius: 999,
    padding: 4,
    backgroundColor: "rgba(246, 243, 233, 0.82)",
  },
  segmentItem: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  segmentItemActive: {
    backgroundColor: palette.accentStrong,
  },
  segmentText: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "800",
  },
  segmentTextActive: {
    color: "#f8fff5",
  },
  clearButton: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  clearText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  fieldGrid: {
    gap: 12,
    marginTop: 18,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 8,
    paddingHorizontal: 14,
    color: palette.ink,
    backgroundColor: "#fffefa",
    fontSize: 18,
  },
  quickRates: {
    flexDirection: "row",
    gap: 10,
  },
  quickRate: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#f2f0ea",
  },
  quickRateText: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  feeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  feeChip: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(15, 123, 85, 0.35)",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: palette.accentStrong,
    backgroundColor: "rgba(229, 245, 223, 0.72)",
    fontSize: 13,
    fontWeight: "700",
  },
  resultPanel: {
    borderWidth: 1,
    borderColor: "rgba(86, 97, 73, 0.2)",
    borderRadius: 8,
    backgroundColor: "rgba(255, 253, 245, 0.94)",
    padding: 16,
    shadowColor: "#2d3625",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 2,
  },
  primaryResult: {
    borderRadius: 8,
    padding: 20,
    backgroundColor: "#0c6245",
  },
  primaryLoss: {
    backgroundColor: palette.lossBg,
  },
  primaryLabel: {
    color: "rgba(248, 255, 245, 0.78)",
    fontWeight: "700",
    marginBottom: 10,
  },
  primaryValue: {
    color: "#f8fff5",
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "900",
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  metric: {
    width: "48%",
    minWidth: 145,
    borderWidth: 1,
    borderColor: "rgba(217, 209, 188, 0.8)",
    borderRadius: 8,
    padding: 14,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  metricLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 7,
  },
  metricValue: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: "800",
  },
  formula: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(15, 123, 85, 0.18)",
    borderRadius: 8,
    padding: 14,
    color: palette.muted,
    backgroundColor: "rgba(246, 243, 233, 0.86)",
    lineHeight: 22,
  },
  confirmButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    marginTop: 12,
    backgroundColor: palette.accentStrong,
  },
  disabledButton: {
    opacity: 0.35,
  },
  confirmText: {
    color: "#f8fff5",
    fontSize: 16,
    fontWeight: "900",
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  historyTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: "900",
  },
  emptyText: {
    color: palette.muted,
    lineHeight: 22,
  },
  historyItem: {
    borderWidth: 1,
    borderColor: "rgba(217, 209, 188, 0.8)",
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  historyItemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  historyType: {
    color: palette.accentStrong,
    fontSize: 12,
    fontWeight: "900",
  },
  historyTime: {
    color: palette.muted,
    fontSize: 12,
  },
  historyName: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 4,
  },
  historySummary: {
    color: palette.ink,
    fontWeight: "800",
    marginBottom: 4,
  },
  historyDetail: {
    color: palette.muted,
    lineHeight: 20,
  },
});
