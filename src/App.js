import React, { useEffect, useMemo, useState } from "react";
import {
  useWindowDimensions,
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
  ink: "#151515",
  muted: "#6d6d6d",
  paper: "#ffffff",
  panel: "#ffffff",
  line: "#e4e4e4",
  accent: "#151515",
  accentStrong: "#151515",
  profitRed: "#d32f2f",
  lossGreen: "#0f7b55",
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
      netLabel: "反T净收益",
      sellLabel: "反T卖出价",
      buyLabel: "反T买入价",
      emptyFormula: "反T净收益 = (反T卖出价 - 反T买入价) × 做T股数 - 买卖佣金 - 印花税",
      actionText: "反T：先买入，后卖出",
    };
  }

  return {
    netLabel: "正T净收益",
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

function StepField({ label, value, onChangeText, onStepDown, onStepUp }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.stepInputRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          inputMode="decimal"
          style={styles.stepInput}
          selectionColor={palette.accent}
        />
        <Pressable onPress={onStepDown} style={styles.stepButton}>
          <Text style={styles.stepButtonText}>-</Text>
        </Pressable>
        <Pressable onPress={onStepUp} style={styles.stepButton}>
          <Text style={styles.stepButtonText}>+</Text>
        </Pressable>
      </View>
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

function ProfitMetric({ value }) {
  const isNegative = typeof value === "number" && value < 0;
  const hasValue = typeof value === "number" && Number.isFinite(value);

  return (
    <View style={[styles.metric, hasValue && (isNegative ? styles.contractLossMetric : styles.contractGainMetric)]}>
      <Text style={styles.metricLabel}>预计盈亏</Text>
      <Text style={[styles.metricValue, hasValue && (isNegative ? styles.contractLossText : styles.contractGainText)]}>
        {hasValue ? formatUsdt(value) : "--"}
      </Text>
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

function TradeCalculator({ addHistory, prefill, isDesktop }) {
  const [mode, setMode] = useState("positive");
  const [form, setForm] = useState({
    costPrice: "",
    totalShares: "200",
    tradeShares: "100",
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

  useEffect(() => {
    if (!prefill) return;
    setMode(prefill.mode || "positive");
    setForm(prefill.form);
  }, [prefill]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleCostPriceChange(value) {
    updateField("costPrice", value);
    if (value) {
      updateField("sellPrice", value);
      updateField("buyPrice", value);
    }
  }

  function clearForm() {
    setForm({
      costPrice: "",
      totalShares: "200",
      tradeShares: "100",
      sellPrice: "",
      buyPrice: "",
    });
  }

  function stepTradeShares(delta) {
    const current = Number(form.tradeShares) || 0;
    const next = Math.max(0, current + delta);
    updateField("tradeShares", next.toString());
  }

  function stepTotalShares(delta) {
    const current = Number(form.totalShares) || 0;
    const next = Math.max(0, current + delta);
    updateField("totalShares", next.toString());
  }

  function stepSellPrice(delta) {
    const current = Number(form.sellPrice) || 0;
    const next = Math.max(0, current + delta);
    updateField("sellPrice", next.toFixed(2));
  }

  function stepBuyPrice(delta) {
    const current = Number(form.buyPrice) || 0;
    const next = Math.max(0, current + delta);
    updateField("buyPrice", next.toFixed(2));
  }

  function saveTrade() {
    if (!result) return;
    addHistory({
      screen: "trade",
      mode,
      form,
      isProfit: result.netProfit > 0,
      type: "股票",
      title: mode === "positive" ? "正T" : "反T",
      summary: `${modeText.netLabel} ${formatCurrency(result.netProfit)}`,
      detail: `${modeText.sellLabel} ${form.sellPrice}，${modeText.buyLabel} ${form.buyPrice}，做T股数 ${form.tradeShares}`,
    });
  }

  return (
    <>
      <View style={{ width: isDesktop ? "48%" : "100%", maxWidth: isDesktop ? 420 : "100%" }}>
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
            <Field label="持仓成本价" value={form.costPrice} onChangeText={handleCostPriceChange} />
            <StepField label="持仓股数" value={form.totalShares} onChangeText={(value) => updateField("totalShares", value)} onStepDown={() => stepTotalShares(-100)} onStepUp={() => stepTotalShares(100)} />
            <StepField label="做T股数" value={form.tradeShares} onChangeText={(value) => updateField("tradeShares", value)} onStepDown={() => stepTradeShares(-100)} onStepUp={() => stepTradeShares(100)} />
            {mode === "reverse" ? (
              <>
                <StepField label={modeText.buyLabel} value={form.buyPrice} onChangeText={(value) => updateField("buyPrice", value)} onStepDown={() => stepBuyPrice(-0.01)} onStepUp={() => stepBuyPrice(0.01)} />
                <StepField label={modeText.sellLabel} value={form.sellPrice} onChangeText={(value) => updateField("sellPrice", value)} onStepDown={() => stepSellPrice(-0.01)} onStepUp={() => stepSellPrice(0.01)} />
              </>
            ) : (
              <>
                <StepField label={modeText.sellLabel} value={form.sellPrice} onChangeText={(value) => updateField("sellPrice", value)} onStepDown={() => stepSellPrice(-0.01)} onStepUp={() => stepSellPrice(0.01)} />
                <StepField label={modeText.buyLabel} value={form.buyPrice} onChangeText={(value) => updateField("buyPrice", value)} onStepDown={() => stepBuyPrice(-0.01)} onStepUp={() => stepBuyPrice(0.01)} />
              </>
            )}
          </View>

          <View style={styles.feeRow}>
            <Text style={styles.feeChip}>{modeText.actionText}</Text>
            <Text style={styles.feeChip}>佣金：万三，买卖双向，单笔最低 5 元</Text>
            <Text style={styles.feeChip}>印花税：卖出金额的 0.05%</Text>
          </View>
        </View>
      </View>

      <View style={{ width: isDesktop ? "48%" : "100%", maxWidth: isDesktop ? 420 : "100%" }}>
        <View style={styles.resultPanel}>
          <View style={[styles.primaryResult, result && (result.isGain ? styles.primaryGain : styles.primaryLoss)]}>
            <Text style={styles.primaryLabel}>{modeText.netLabel}</Text>
            <Text style={styles.primaryValue}>{formatCurrency(result?.netProfit)}</Text>
          </View>

          <View style={styles.metrics}>
            <Metric label="价差收益" value={formatCurrency(result?.spreadProfit)} />
            <Metric label="做T后新成本价" value={result ? formatPrice(result.newCostPrice) : "--"} />
            <Metric label="成本降低" value={result ? formatPrice(result.costReduction) : "--"} />
            <Metric label="总佣金" value={formatCurrency(result?.totalCommission)} />
            <Metric label="卖出佣金" value={formatCurrency(result?.sellCommission)} />
            <Metric label="买入佣金" value={formatCurrency(result?.buyCommission)} />
            <Metric label="印花税" value={formatCurrency(result?.stampTax)} />
          </View>

          <Text style={styles.formula}>{formulaText}</Text>
          <Pressable onPress={saveTrade} style={[styles.confirmButton, !result && styles.disabledButton]}>
            <Text style={styles.confirmText}>确认并存入历史</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

function ContractCalculator({ addHistory, prefill, isDesktop }) {
  const [side, setSide] = useState("long");
  const [form, setForm] = useState({
    entryPrice: "",
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

  useEffect(() => {
    if (!prefill) return;
    setSide(prefill.side || "long");
    setForm(prefill.form);
  }, [prefill]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function quickRate(value) {
    updateField("callbackRate", value);
  }

  function stepRate(delta) {
    const current = Number(form.callbackRate) || 0;
    const next = Math.max(0, current + delta);
    updateField("callbackRate", Number(next.toFixed(2)).toString());
  }

  function clearForm() {
    setForm({ entryPrice: "", callbackRate: "", quantity: "", activationPrice: "" });
  }

  function saveContract() {
    if (!result) return;
    addHistory({
      screen: "contract",
      side,
      form,
      isProfit: result.estimatedProfit > 0,
      type: "合约",
      title: sideText,
      summary: `预计止盈价 ${formatUsdt(result.expectedPrice)}`,
      detail: `成本价 ${formatUsdt(result.entryPrice)}，激活价 ${formatUsdt(result.activationPrice)}，回调率 ${result.callbackRate}%，数量 ${form.quantity || "--"} USDT`,
    });
  }

  return (
    <>
      <View style={{ width: isDesktop ? "48%" : "100%", maxWidth: isDesktop ? 420 : "100%" }}>
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
            <Field label="成本价（USDT）" value={form.entryPrice} onChangeText={(value) => updateField("entryPrice", value)} />
            <StepField
              label="回调率（%）"
              value={form.callbackRate}
              onChangeText={(value) => updateField("callbackRate", value)}
              onStepDown={() => stepRate(-0.1)}
              onStepUp={() => stepRate(0.1)}
            />
            <View style={styles.quickRates}>
              {["0.1", "0.3", "0.5", "1"].map((rate) => (
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
      </View>

      <View style={{ width: isDesktop ? "48%" : "100%", maxWidth: isDesktop ? 420 : "100%" }}>
        <View style={styles.resultPanel}>
          <View style={styles.primaryResult}>
            <Text style={styles.primaryLabel}>预计止盈价</Text>
            <Text style={styles.primaryValue}>{result ? formatUsdt(result.expectedPrice) : "--"}</Text>
          </View>

          <View style={styles.metrics}>
            <ProfitMetric value={result?.entryPrice && result?.quantity ? result.estimatedProfit : undefined} />
            <Metric label="方向" value={sideText} />
            <Metric label="激活价格" value={result ? formatUsdt(result.activationPrice) : "--"} />
            <Metric label="成本价" value={result?.entryPrice ? formatUsdt(result.entryPrice) : "--"} />
            <Metric label="回调率" value={result ? `${result.callbackRate}%` : "--"} />
            <Metric label="回调价差" value={result ? formatUsdt(result.callbackAmount) : "--"} />
            <Metric label="数量" value={form.quantity ? `${form.quantity} USDT` : "--"} />
          </View>

          <Text style={styles.formula}>{description}</Text>
          <Pressable onPress={saveContract} style={[styles.confirmButton, !result && styles.disabledButton]}>
            <Text style={styles.confirmText}>确认并存入历史</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

function ValuationScreen({ isDesktop }) {
  const [form, setForm] = useState({
    price: "",
    earnings: "",
    eps: "",
    bookValue: "",
    dividend: "",
  });

  const result = useMemo(() => {
    if (!form.price) return null;
    
    const price = Number(form.price);
    const earnings = Number(form.earnings);
    const eps = Number(form.eps);
    const bookValue = Number(form.bookValue);
    const dividend = Number(form.dividend);

    return {
      pe: eps > 0 ? (price / eps).toFixed(2) : "--",
      pb: bookValue > 0 ? (price / bookValue).toFixed(2) : "--",
      dividendYield: price > 0 && dividend > 0 ? ((dividend / price) * 100).toFixed(2) : "--",
      marketCap: earnings > 0 && eps > 0 ? ((earnings / eps) * price / 10000).toFixed(2) : "--",
    };
  }, [form]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <View style={{ width: isDesktop ? "100%" : "100%", paddingHorizontal: isDesktop ? "8%" : 12 }}>
      <View style={{ ...styles.panel, paddingTop: 12 }}>
        <View style={styles.fieldGrid}>
          <Field label="当前股价（元）" value={form.price} onChangeText={(value) => updateField("price", value)} />
          <Field label="每股收益 EPS（元）" value={form.eps} onChangeText={(value) => updateField("eps", value)} />
          <Field label="每股净资产（元）" value={form.bookValue} onChangeText={(value) => updateField("bookValue", value)} />
          <Field label="每股股息（元）" value={form.dividend} onChangeText={(value) => updateField("dividend", value)} />
          <Field label="净利润（万元）" value={form.earnings} onChangeText={(value) => updateField("earnings", value)} />
        </View>
      </View>

      <View style={{ ...styles.resultPanel, marginTop: 12 }}>
        <View style={styles.primaryResult}>
          <Text style={styles.primaryLabel}>估值指标</Text>
          <Text style={styles.primaryValue}>{result ? "已计算" : "--"}</Text>
        </View>

        <View style={styles.metrics}>
          <Metric label="市盈率 (PE)" value={result?.pe || "--"} />
          <Metric label="市净率 (PB)" value={result?.pb || "--"} />
          <Metric label="股息率" value={result?.dividendYield ? `${result.dividendYield}%` : "--"} />
          <Metric label="市值（万元）" value={result?.marketCap || "--"} />
        </View>

        <Text style={styles.formula}>
          市盈率 = 当前股价 / 每股收益 (EPS)
{"\n"}
          市净率 = 当前股价 / 每股净资产
{"\n"}
          股息率 = 每股股息 / 当前股价 × 100%
{"\n"}
          市值 = (净利润 / EPS) × 当前股价
        </Text>
      </View>
    </View>
  );
}

function HistoryScreen({ history, clearHistory, onSelectHistory, isDesktop }) {
  return (
    <View style={{ ...styles.resultPanel, paddingHorizontal: isDesktop ? "8%" : 12 }}>
      <View style={styles.historyHeader}>
        <Pressable onPress={clearHistory} style={styles.clearButton}>
          <Text style={styles.clearText}>清空</Text>
        </Pressable>
      </View>

      {history.length === 0 ? (
        <Text style={styles.emptyText}>还没有记录。做T或合约页点“确认并存入历史”后会出现在这里。</Text>
      ) : (
        <View style={{ flexDirection: isDesktop ? "row" : "column", flexWrap: "wrap", gap: isDesktop ? 24 : 0 }}>
          {history.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onSelectHistory(item)}
              style={[{ width: isDesktop ? "48%" : "100%", maxWidth: isDesktop ? 420 : "100%" }, styles.historyItem, item.isProfit && styles.historyProfitItem]}
            >
              <View style={styles.historyItemTop}>
                <Text style={styles.historyType}>{item.type}</Text>
                <Text style={styles.historyTime}>{item.time}</Text>
              </View>
              <View style={styles.historyDetail}>
                <View style={styles.historyDetailRow}>
                  <Text style={styles.historyDetailLabel}>方向</Text>
                  <Text style={styles.historyDetailValue}>{item.title}</Text>
                </View>
                <View style={styles.historyDetailRow}>
                  <Text style={styles.historyDetailLabel}>{item.summary.split('：')[0]}</Text>
                  <Text style={styles.historySummaryValue}>{item.summary.split('：')[1]}</Text>
                </View>
                {Array.isArray(item.detail) && (
                  item.detail.map((detailItem, index) => (
                    <View key={index} style={styles.historyDetailRow}>
                      <Text style={styles.historyDetailLabel}>{detailItem.label}</Text>
                      <Text style={styles.historyDetailValue}>{detailItem.value}</Text>
                    </View>
                  ))
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const screenOptions = [
  { label: "股票", value: "trade" },
  { label: "合约", value: "contract" },
  { label: "估值", value: "valuation" },
  { label: "历史", value: "history" },
];

function getScreenLabel(screen) {
  return screenOptions.find((item) => item.value === screen)?.label || "菜单";
}

export default function App() {
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && screenWidth >= 768;
  const [screen, setScreen] = useState("trade");
  const [menuOpen, setMenuOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [tradePrefill, setTradePrefill] = useState(null);
  const [contractPrefill, setContractPrefill] = useState(null);

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
  }

  function chooseScreen(value) {
    setScreen(value);
    setMenuOpen(false);
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
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.paper} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
            {screen === "valuation" && <ValuationScreen isDesktop={isDesktop} />}
            {screen === "history" && <HistoryScreen history={history} clearHistory={() => setHistory([])} onSelectHistory={selectHistory} isDesktop={isDesktop} />}
          </View>
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
    padding: 0,
    paddingBottom: 32,
    gap: 0,
    alignItems: "stretch",
  },
  mainContainer: {
    flexDirection: "column",
    gap: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  panelColumn: {
    width: "100%",
  },
  panelContainer: {
    flexDirection: "column",
    flexWrap: "wrap",
    gap: 0,
    paddingHorizontal: 0,
  },
  appHeader: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    zIndex: 10,
  },
  menuButton: {
    width: 36,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  menuIcon: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
  },
  screenTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: "900",
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  menuPanel: {
    position: "absolute",
    top: 42,
    left: 0,
    width: 132,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 12,
    padding: 6,
    backgroundColor: palette.panel,
    shadowColor: "#151515",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  menuItem: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  menuItemActive: {
    backgroundColor: "#f2f2f2",
  },
  menuItemText: {
    color: palette.muted,
    fontSize: 15,
    fontWeight: "800",
  },
  menuItemTextActive: {
    color: palette.ink,
  },
  panel: {
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
    padding: 12,
    elevation: 0,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  segment: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 999,
    padding: 4,
    backgroundColor: "#ffffff",
  },
  segmentItem: {
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  segmentItemActive: {
    backgroundColor: palette.ink,
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
    borderColor: "#e6e6e6",
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  clearText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  fieldGrid: {
    gap: 10,
    marginTop: 14,
  },
  field: {
    gap: 7,
  },
  fieldLabel: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 7,
    paddingHorizontal: 14,
    color: palette.ink,
    backgroundColor: "#ffffff",
    fontSize: 17,
  },
  stepInputRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 7,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  stepInput: {
    flex: 1,
    paddingHorizontal: 14,
    color: palette.ink,
    fontSize: 17,
  },
  stepButton: {
    width: 46,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#eeeeee",
    backgroundColor: "#fafafa",
  },
  stepButtonText: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: "900",
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
    borderRadius: 7,
    backgroundColor: "#f5f5f5",
  },
  quickRateText: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  feeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  feeChip: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#e2e2e2",
    borderRadius: 7,
    paddingVertical: 7,
    paddingHorizontal: 10,
    color: palette.ink,
    backgroundColor: "#f7f7f7",
    fontSize: 13,
    fontWeight: "700",
  },
  resultPanel: {
    borderWidth: 0,
    borderRadius: 7,
    backgroundColor: "transparent",
    padding: 12,
    elevation: 0,
  },
  primaryResult: {
    borderRadius: 8,
    padding: 18,
    backgroundColor: palette.ink,
  },
  primaryGain: {
    backgroundColor: palette.profitRed,
  },
  primaryLoss: {
    backgroundColor: palette.lossGreen,
  },
  primaryLabel: {
    color: "rgba(248, 255, 245, 0.78)",
    fontWeight: "700",
    marginBottom: 8,
  },
  primaryValue: {
    color: "#f8fff5",
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  metric: {
    width: "48%",
    minWidth: 145,
    borderWidth: 1,
    borderColor: "#eeeeee",
    borderRadius: 7,
    padding: 12,
    backgroundColor: "#ffffff",
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
  contractGainMetric: {
    borderColor: "rgba(15, 123, 85, 0.38)",
    backgroundColor: "rgba(15, 123, 85, 0.08)",
  },
  contractLossMetric: {
    borderColor: "rgba(182, 48, 48, 0.34)",
    backgroundColor: "rgba(182, 48, 48, 0.08)",
  },
  contractGainText: {
    color: palette.lossGreen,
  },
  contractLossText: {
    color: palette.profitRed,
  },
  formula: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 7,
    padding: 12,
    color: palette.muted,
    backgroundColor: "#ffffff",
    lineHeight: 22,
  },
  confirmButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
    marginTop: 12,
    backgroundColor: palette.ink,
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
    borderWidth: 0,
    borderColor: "rgba(217, 209, 188, 0.8)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#ffffff",
    shadowColor: "#151515",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  historyProfitItem: {
    backgroundColor: "#ffffff",
    borderWidth: 0,
  },
  historyItemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  historySummaryValue: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "900",
  },
  historyNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  historyType: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  historyTime: {
    color: palette.muted,
    fontSize: 11,
    opacity: 0.7,
  },
  historyName: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  historySummary: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 8,
  },
  historyDetail: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  historyDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  historyDetailLabel: {
    color: palette.muted,
    fontSize: 13,
  },
  historyDetailValue: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "600",
  },
});
