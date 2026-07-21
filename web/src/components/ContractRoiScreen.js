import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { calculateRoiContract } from "../calculator";
import { formatUsdt } from "../utils";
import styles from "../styles";
import Field from "./common/Field";
import StepField from "./common/StepField";
import Segment from "./common/Segment";
import Metric from "./common/Metric";
import ProfitMetric from "./common/ProfitMetric";

const ROI_QUICK_RATES = ["50", "100", "150", "200", "300"];

const defaultForm = {
  symbol: "BTCUSDT",
  entryPrice: "",
  currentPrice: "",
  leverage: "100",
  targetRoi: "100",
  quantity: "",
};

export default function ContractRoiScreen({ addHistory, prefill, isDesktop }) {
  const [side, setSide] = useState("long");
  const [form, setForm] = useState(defaultForm);

  const result = useMemo(() => calculateRoiContract({ ...form, side }), [form, side]);
  const sideText = side === "long" ? "做多" : "做空";
  const symbolText = form.symbol.trim() || "合约";

  const description = result
    ? side === "long"
      ? `${symbolText} 做多 ${result.leverage}x：价格上涨 ${formatNumber(result.priceMovePercent)}%（约 ${formatUsdt(result.priceMoveAmount)}）时，投资回报率约 ${result.targetRoi}%；止盈价 ${formatUsdt(result.takeProfitPrice)}，止损价 ${formatUsdt(result.stopLossPrice)}。`
      : `${symbolText} 做空 ${result.leverage}x：价格下跌 ${formatNumber(result.priceMovePercent)}%（约 ${formatUsdt(result.priceMoveAmount)}）时，投资回报率约 ${result.targetRoi}%；止盈价 ${formatUsdt(result.takeProfitPrice)}，止损价 ${formatUsdt(result.stopLossPrice)}。`
    : "输入品种、开仓价、杠杆和目标回报率后，自动计算多空方向的止盈价与止损价。";

  useEffect(() => {
    if (!prefill) return;
    setSide(prefill.side || "long");
    setForm({ ...defaultForm, ...prefill.form });
  }, [prefill]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function quickRoi(value) {
    updateField("targetRoi", value);
  }

  function stepRoi(delta) {
    const current = Number(form.targetRoi) || 0;
    const next = Math.max(0, current + delta);
    updateField("targetRoi", Number(next.toFixed(0)).toString());
  }

  function stepLeverage(delta) {
    const current = Number(form.leverage) || 0;
    const next = Math.max(1, current + delta);
    updateField("leverage", Number(next.toFixed(0)).toString());
  }

  function clearForm() {
    setForm(defaultForm);
  }

  function saveContract() {
    if (!result) return;
    addHistory({
      screen: "contractRoi",
      side,
      form,
      isProfit: true,
      type: "止盈止损",
      title: `${symbolText} ${sideText}`,
      summary: `止盈价：${formatUsdt(result.takeProfitPrice)}`,
      detail: [
        { label: "品种", value: symbolText },
        { label: "开仓价", value: formatUsdt(result.entryPrice) },
        { label: "当前价", value: result.currentPrice ? formatUsdt(result.currentPrice) : "--" },
        { label: "杠杆", value: `${result.leverage}x` },
        { label: "目标回报率", value: `${result.targetRoi}%` },
        { label: "止损价", value: formatUsdt(result.stopLossPrice) },
        { label: "数量", value: `${form.quantity || "--"} USDT` },
      ],
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
            <Field
              label="品种"
              value={form.symbol}
              onChangeText={(value) => updateField("symbol", value.toUpperCase())}
              placeholder="BTCUSDT"
              keyboardType="default"
              autoCapitalize="characters"
            />
            <Field label="开仓价格（USDT）" value={form.entryPrice} onChangeText={(value) => updateField("entryPrice", value)} />
            <Field label="当前价格（USDT）" value={form.currentPrice} onChangeText={(value) => updateField("currentPrice", value)} />
            <StepField
              label="杠杆（x）"
              value={form.leverage}
              onChangeText={(value) => updateField("leverage", value)}
              onStepDown={() => stepLeverage(-1)}
              onStepUp={() => stepLeverage(1)}
            />
            <StepField
              label="目标回报率（%）"
              value={form.targetRoi}
              onChangeText={(value) => updateField("targetRoi", value)}
              onStepDown={() => stepRoi(-10)}
              onStepUp={() => stepRoi(10)}
            />
            <View style={styles.quickRates}>
              {ROI_QUICK_RATES.map((rate) => {
                const active = form.targetRoi === rate;
                return (
                  <Pressable
                    key={rate}
                    onPress={() => quickRoi(rate)}
                    style={[styles.quickRate, active && styles.quickRateActive]}
                  >
                    <Text style={[styles.quickRateText, active && styles.quickRateTextActive]}>{rate}%</Text>
                  </Pressable>
                );
              })}
            </View>
            <Field label="数量（USDT，可选）" value={form.quantity} onChangeText={(value) => updateField("quantity", value)} />
          </View>

          <View style={styles.feeRow}>
            <Text style={styles.feeChip}>固定止盈止损</Text>
            <Text style={styles.feeChip}>价格变动% = 回报率 ÷ 杠杆</Text>
          </View>
        </View>
      </View>

      <View style={{ width: isDesktop ? "48%" : "100%", maxWidth: isDesktop ? 420 : "100%" }}>
        <View style={styles.resultPanel}>
          <View style={styles.primaryResult}>
            <Text style={styles.primaryLabel}>止盈触发价</Text>
            <Text style={styles.primaryValue}>{result ? formatUsdt(result.takeProfitPrice) : "--"}</Text>
          </View>

          <View style={styles.gapCard}>
            <Text style={styles.gapCardTitle}>距当前价格</Text>
            {result?.gapToTakeProfit ? (
              <>
                <View style={styles.gapRow}>
                  <Text style={styles.gapLabel}>距止盈</Text>
                  <Text style={styles.gapValue}>
                    {formatGapDirection(result.gapToTakeProfit.direction)} {formatUsdt(result.gapToTakeProfit.amount)}
                  </Text>
                </View>
                <Text style={styles.gapSub}>
                  需{formatMoveVerb(result.gapToTakeProfit.direction)} {formatNumber(result.gapToTakeProfit.percent)}%
                </Text>
                <View style={[styles.gapRow, styles.gapRowSpaced]}>
                  <Text style={styles.gapLabel}>距止损</Text>
                  <Text style={styles.gapValue}>
                    {formatGapDirection(result.gapToStopLoss.direction)} {formatUsdt(result.gapToStopLoss.amount)}
                  </Text>
                </View>
                <Text style={styles.gapSub}>
                  需{formatMoveVerb(result.gapToStopLoss.direction)} {formatNumber(result.gapToStopLoss.percent)}%
                </Text>
              </>
            ) : (
              <Text style={styles.gapEmpty}>填写当前价格后，显示距止盈/止损还差多少</Text>
            )}
          </View>

          <View style={styles.metrics}>
            <Metric label="止损触发价" value={result ? formatUsdt(result.stopLossPrice) : "--"} />
            <ProfitMetric value={result?.quantity ? result.estimatedProfit : undefined} />
            <Metric label="品种" value={symbolText} />
            <Metric label="方向" value={`${sideText} ${form.leverage || "--"}x`} />
            <Metric label="开仓价" value={result ? formatUsdt(result.entryPrice) : "--"} />
            <Metric label="当前价" value={result?.currentPrice ? formatUsdt(result.currentPrice) : "--"} />
            <Metric label="目标回报率" value={result ? `${result.targetRoi}%` : "--"} />
            <Metric label="所需涨跌幅" value={result ? `${formatNumber(result.priceMovePercent)}%` : "--"} />
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

function formatNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? Number(value.toFixed(4)).toString() : "--";
}

function formatGapDirection(direction) {
  if (direction === "up") return "上方";
  if (direction === "down") return "下方";
  return "持平";
}

function formatMoveVerb(direction) {
  if (direction === "up") return "上涨";
  if (direction === "down") return "下跌";
  return "变动";
}
