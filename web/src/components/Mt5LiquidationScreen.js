import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { calculateMt5Liquidation } from "../calculator";
import { formatUsdt } from "../utils";
import styles from "../styles";
import Field from "./common/Field";
import StepField from "./common/StepField";
import Segment from "./common/Segment";
import Metric from "./common/Metric";

const LOT_QUICK = ["0.01", "0.10", "0.50", "1.00"];
const BALANCE_QUICK = ["100", "500", "1000", "5000"];

const defaultForm = {
  entryPrice: "4257.56",
  lotSize: "0.01",
  balance: "350",
  credit: "",
  currentPrice: "4232.73",
};

const RISK_LABELS = {
  low: { text: "低风险", color: "#0f7b55", desc: "保证金水平 > 150%，账户资金充足" },
  medium: { text: "中风险", color: "#d48806", desc: "50% < 保证金水平 ≤ 150%，注意风险" },
  high: { text: "高风险", color: "#d32f2f", desc: "20% < 保证金水平 ≤ 50%，随时可能爆仓" },
  stopout: { text: "爆仓", color: "#000000", desc: "保证金水平 ≤ 20%，持仓将被强制平仓" },
  unknown: { text: "待计算", color: "#6d6d6d", desc: "填写当前价后计算保证金水平" },
};

function formatNumber(value, digits = 2) {
  return typeof value === "number" && Number.isFinite(value)
    ? Number(value.toFixed(digits)).toString()
    : "--";
}

function formatGapAmount(gap) {
  if (!gap) return "--";
  const sign = gap.direction === "up" ? "+" : gap.direction === "down" ? "-" : "";
  return `${sign}${formatUsdt(gap.amount)}`;
}

function formatGapPercent(gap) {
  if (!gap) return "--";
  const sign = gap.direction === "up" ? "+" : gap.direction === "down" ? "-" : "";
  return `${sign}${formatNumber(gap.percent)}%`;
}

export default function Mt5LiquidationScreen({ addHistory, prefill, isDesktop }) {
  const [side, setSide] = useState("long");
  const [form, setForm] = useState(defaultForm);

  const result = useMemo(() => calculateMt5Liquidation({ ...form, side }), [form, side]);
  const sideText = side === "long" ? "做多" : "做空";

  useEffect(() => {
    if (!prefill) return;
    setSide(prefill.side || "long");
    setForm({ ...defaultForm, ...prefill.form });
  }, [prefill]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function changeSide(nextSide) {
    setSide(nextSide);
  }

  function stepLotSize(delta) {
    const current = Number(form.lotSize) || 0;
    const next = Math.max(0.01, Number((current + delta).toFixed(2)));
    updateField("lotSize", next.toString());
  }

  function stepBalance(delta) {
    const current = Number(form.balance) || 0;
    const next = Math.max(0, current + delta);
    updateField("balance", Number(next.toFixed(2)).toString());
  }

  function stepCredit(delta) {
    const current = Number(form.credit) || 0;
    const next = Math.max(0, current + delta);
    updateField("credit", Number(next.toFixed(2)).toString());
  }

  function clearForm() {
    setForm(defaultForm);
  }

  function saveLiquidation() {
    if (!result) return;
    addHistory({
      screen: "mt5Liquidation",
      side,
      form,
      isProfit: false,
      type: "MT5强平",
      title: sideText,
      summary: `强平价：${formatUsdt(result.liquidationPrice)}`,
      detail: [
        { label: "开仓价", value: formatUsdt(result.entryPrice) },
        { label: "手数", value: `${result.lotSize} 手` },
        { label: "保证金", value: formatUsdt(result.usedMargin) },
        ...(result.hasCurrentPrice
          ? [
              { label: "净值", value: formatUsdt(result.equity) },
              { label: "浮动盈亏", value: `${result.floatingPnl >= 0 ? "+" : ""}${formatUsdt(result.floatingPnl)}` },
              { label: "保证金水平", value: `${formatNumber(result.marginLevel)}%` },
              { label: "可用保证金", value: formatUsdt(result.availableMargin) },
            ]
          : []),
        { label: "强平价", value: formatUsdt(result.liquidationPrice) },
      ],
    });
  }

  const risk = result ? RISK_LABELS[result.riskLevel] : RISK_LABELS.unknown;
  const priceMoveLabel = side === "long" ? "强平跌幅" : "强平涨幅";

  return (
    <>
      <View style={{ width: isDesktop ? "48%" : "100%", maxWidth: isDesktop ? 420 : "100%" }}>
        <View style={styles.panel}>
          <View style={styles.topRow}>
            <Segment
              value={side}
              onChange={changeSide}
              items={[
                { label: "做多", value: "long" },
                { label: "做空", value: "short" },
              ]}
            />
            <View style={styles.topRowRight}>
              <View style={styles.leverageBadge}>
                <Text style={styles.leverageBadgeText}>500 : 1</Text>
              </View>
              <Pressable onPress={clearForm} style={styles.clearButton}>
                <Text style={styles.clearText}>清空</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.fieldGrid}>
            <Field label="开仓价格 (USD)" value={form.entryPrice} onChangeText={(value) => updateField("entryPrice", value)} />
            <StepField
              label="交易手数"
              value={form.lotSize}
              onChangeText={(value) => updateField("lotSize", value)}
              onStepDown={() => stepLotSize(-0.01)}
              onStepUp={() => stepLotSize(0.01)}
            />
            <View style={styles.quickRates}>
              {LOT_QUICK.map((value) => {
                const active = form.lotSize === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => updateField("lotSize", value)}
                    style={[styles.quickRate, active && styles.quickRateActive]}
                  >
                    <Text style={[styles.quickRateText, active && styles.quickRateTextActive]}>{value}</Text>
                  </Pressable>
                );
              })}
            </View>

            <StepField
              label="账户余额 (USD)"
              value={form.balance}
              onChangeText={(value) => updateField("balance", value)}
              onStepDown={() => stepBalance(-10)}
              onStepUp={() => stepBalance(10)}
            />
            <View style={styles.quickRates}>
              {BALANCE_QUICK.map((value) => {
                const active = form.balance === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => updateField("balance", value)}
                    style={[styles.quickRate, active && styles.quickRateActive]}
                  >
                    <Text style={[styles.quickRateText, active && styles.quickRateTextActive]}>{value}</Text>
                  </Pressable>
                );
              })}
            </View>

            <StepField
              label="信用额 (USD)"
              value={form.credit}
              onChangeText={(value) => updateField("credit", value)}
              onStepDown={() => stepCredit(-1)}
              onStepUp={() => stepCredit(1)}
            />

            <Field
              label="当前价格 (USD)"
              value={form.currentPrice}
              onChangeText={(value) => updateField("currentPrice", value)}
              placeholder="选填，计算保证金水平"
            />
          </View>

          <View style={styles.feeRow}>
            <Text style={styles.feeChip}>MT5 保证金规则</Text>
            <Text style={styles.feeChip}>保证金水平 = 净值 ÷ 保证金 × 100</Text>
            <Text style={styles.feeChip}>净值 = 余额 + 信用额 + 浮动盈亏</Text>
          </View>
        </View>
      </View>

      <View style={{ width: isDesktop ? "48%" : "100%", maxWidth: isDesktop ? 420 : "100%" }}>
        <View style={styles.resultPanel}>
          {result?.hasCurrentPrice ? (
            <View style={[styles.triggerCard, styles.triggerCardLoss]}>
              <Text style={styles.triggerCardLabel}>保证金水平</Text>
              <View style={styles.marginLevelRow}>
                <Text style={[styles.triggerCardValue, { color: risk.color }]}>
                  {result.marginLevel != null ? `${formatNumber(result.marginLevel)}%` : "--"}
                </Text>
                <View style={[styles.riskBadge, { borderColor: risk.color }]}>
                  <Text style={[styles.riskBadgeText, { color: risk.color }]}>{risk.text}</Text>
                </View>
              </View>
              <Text style={styles.riskDesc}>{risk.desc}</Text>
            </View>
          ) : null}

          <View style={styles.triggerCard}>
            <Text style={styles.triggerCardLabel}>强平价 (爆仓价)</Text>
            <Text style={[styles.triggerCardValue, styles.gapDownText]}>
              {result ? formatUsdt(result.liquidationPrice) : "--"}
            </Text>
            <View style={styles.triggerKvList}>
              <View style={[styles.roiCardRow, styles.triggerMetricRow]}>
                <View style={styles.roiCard}>
                  <Text style={styles.roiCardLabel}>{priceMoveLabel}</Text>
                  <Text style={[styles.roiCardValue, result ? styles.gapDownText : null]}>
                    {result ? `${side === "long" ? "-" : "+"}${formatNumber(result.priceMovePercent)}%` : "--"}
                  </Text>
                </View>
                <View style={styles.roiCard}>
                  <Text style={styles.roiCardLabel}>强平价差</Text>
                  <Text style={[styles.roiCardValue, result ? styles.gapDownText : null]}>
                    {result ? formatUsdt(result.priceMoveAmount) : "--"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {result?.hasCurrentPrice && result.gapToLiquidation ? (
            <View style={[styles.gapCard, styles.triggerCardSpaced]}>
              <Text style={styles.gapCardTitle}>距强平价</Text>
              <Text style={styles.gapCardPrice}>
                {result ? formatUsdt(result.liquidationPrice) : "--"}
              </Text>
              <View style={styles.reachStack}>
                <GapToLiquidationMetric gap={result.gapToLiquidation} floatingPnl={result.floatingPnl} marginLevel={result.marginLevel} />
              </View>
            </View>
          ) : null}

          {result?.hasCurrentPrice ? (
            <View style={[styles.gapCard, styles.triggerCardSpaced]}>
              <Text style={styles.gapCardTitle}>当前账户</Text>
              <View style={styles.roiCardRow}>
                <View
                  style={[
                    styles.roiCard,
                    result.floatingPnl >= 0 ? styles.roiCardGain : styles.roiCardLoss,
                  ]}
                >
                  <Text style={styles.roiCardLabel}>浮动盈亏</Text>
                  <Text
                    style={[
                      styles.roiCardValue,
                      result.floatingPnl >= 0 ? styles.gapUpText : styles.gapDownText,
                    ]}
                  >
                    {`${result.floatingPnl >= 0 ? "+" : ""}${formatUsdt(result.floatingPnl)}`}
                  </Text>
                </View>
                <View style={styles.roiCard}>
                  <Text style={styles.roiCardLabel}>净值</Text>
                  <Text style={styles.roiCardValue}>
                    {formatUsdt(result.equity)}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.metrics}>
            <Metric label="方向" value={sideText} />
            <Metric label="手数" value={result ? `${result.lotSize} 手` : "--"} />
            <Metric label="开仓价" value={result ? formatUsdt(result.entryPrice) : "--"} />
            <Metric label="占用保证金" value={result ? formatUsdt(result.usedMargin) : "--"} />
            {result?.hasCurrentPrice ? (
              <>
                <Metric label="可用保证金" value={formatUsdt(result.availableMargin)} />
                <Metric label="保证金水平" value={result ? `${formatNumber(result.marginLevel)}%` : "--"} />
              </>
            ) : null}
            <Metric label="余额" value={form.balance ? formatUsdt(result?.balance) : "--"} />
            {form.credit ? (
              <Metric label="信用额" value={formatUsdt(result?.credit)} />
            ) : null}
          </View>

          <Pressable onPress={saveLiquidation} style={[styles.confirmButton, !result && styles.disabledButton]}>
            <Text style={styles.confirmText}>确认并存入历史</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

function GapToLiquidationMetric({ gap, floatingPnl, marginLevel }) {
  const reached = gap.reached || gap.direction === "flat";

  const rateLabel = reached ? "保证金水平" : "涨跌幅";
  const amountLabel = reached ? "浮动盈亏" : "价差";

  let rateValue = formatGapPercent(gap);
  let amountValue = formatGapAmount(gap);

  if (reached) {
    if (typeof marginLevel === "number" && Number.isFinite(marginLevel)) {
      rateValue = `${formatNumber(marginLevel)}%`;
    }
    if (typeof floatingPnl === "number" && Number.isFinite(floatingPnl)) {
      amountValue = `${floatingPnl >= 0 ? "+" : ""}${formatUsdt(floatingPnl)}`;
    }
  }

  return (
    <View style={styles.reachStackItem}>
      <GapLabel direction={gap.direction} reached={reached} />
      <View style={styles.metricKvList}>
        <View style={styles.metricKvRow}>
          <Text style={styles.metricKvKey}>{rateLabel}</Text>
          <Text style={styles.metricKvValuePlain}>{rateValue}</Text>
        </View>
        <View style={styles.metricKvRow}>
          <Text style={styles.metricKvKey}>{amountLabel}</Text>
          <Text style={styles.metricKvValue}>{amountValue}</Text>
        </View>
      </View>
    </View>
  );
}

function GapLabel({ direction, reached }) {
  if (reached || direction === "flat") {
    return (
      <Text style={styles.roiCardLabel}>
        当前价格已到
        <Text style={styles.gapDownText}>强平价</Text>
      </Text>
    );
  }
  if (direction === "up") {
    return (
      <Text style={styles.roiCardLabel}>
        {`到强平价还需`}
        <Text style={styles.gapUpText}>涨</Text>
      </Text>
    );
  }
  if (direction === "down") {
    return (
      <Text style={styles.roiCardLabel}>
        {`到强平价还需`}
        <Text style={styles.gapDownText}>跌</Text>
      </Text>
    );
  }
  return <Text style={styles.roiCardLabel}>已到强平价</Text>;
}
