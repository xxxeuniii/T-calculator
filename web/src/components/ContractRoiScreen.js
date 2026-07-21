import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import {
  calculatePricesFromRoi,
  calculateRiskRewardFromPrices,
  calculateRoiContract,
  calculateRoiFromPrice,
  calculateStopLossFromRiskReward,
  formatRiskRewardRatio,
  parseRiskRewardRatio,
} from "../calculator";
import { formatUsdt } from "../utils";
import styles from "../styles";
import Field from "./common/Field";
import StepField from "./common/StepField";
import Segment from "./common/Segment";
import Metric from "./common/Metric";

const ROI_QUICK_RATES = ["50", "100", "150", "200", "300"];
const RISK_REWARD_QUICK = ["1:1", "1:2", "1:3", "1:4", "1:5"];

const defaultForm = {
  entryPrice: "",
  currentPrice: "",
  leverage: "100",
  targetRoi: "100",
  riskReward: "1:3",
  takeProfitPrice: "",
  stopLossPrice: "",
  quantity: "",
};

function formatPriceInput(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return Number(value.toFixed(2)).toString();
}

function formatRoiInput(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return Number(Math.max(0, value).toFixed(2)).toString();
}

function syncStopLossFromRiskReward(form, side) {
  const multiple = parseRiskRewardRatio(form.riskReward || "1:3");
  const stopLoss = calculateStopLossFromRiskReward(
    form.entryPrice,
    form.takeProfitPrice,
    side,
    multiple
  );

  if (stopLoss === null) {
    return {
      ...form,
      riskReward: form.riskReward || "1:3",
    };
  }

  return {
    ...form,
    riskReward: form.riskReward || "1:3",
    stopLossPrice: formatPriceInput(stopLoss),
  };
}

function syncTakeProfitFromRoi(form, side) {
  const nextForm = {
    ...form,
    leverage: form.leverage && Number(form.leverage) > 0 ? form.leverage : "100",
    targetRoi: form.targetRoi === "" || form.targetRoi === undefined ? "100" : form.targetRoi,
    riskReward: form.riskReward || "1:3",
  };
  const derived = calculatePricesFromRoi(nextForm.entryPrice, nextForm.leverage, nextForm.targetRoi, side);
  if (!derived) {
    return {
      ...nextForm,
      takeProfitPrice: "",
    };
  }

  return syncStopLossFromRiskReward(
    {
      ...nextForm,
      takeProfitPrice: formatPriceInput(derived.takeProfitPrice),
    },
    side
  );
}

export default function ContractRoiScreen({ addHistory, prefill, isDesktop }) {
  const [side, setSide] = useState("long");
  const [form, setForm] = useState(() => syncTakeProfitFromRoi(defaultForm, "long"));

  const result = useMemo(() => calculateRoiContract({ ...form, side }), [form, side]);
  const sideText = side === "long" ? "做多" : "做空";

  const description = result
    ? result.hasStopLoss
      ? `${sideText} ${result.leverage}x：止盈价 ${formatUsdt(result.takeProfitPrice)}（+${formatNumber(result.takeProfitRoi)}%），止损价 ${formatUsdt(result.stopLossPrice)}（亏损 ${formatNumber(result.stopLossRoi)}%），盈亏比 ${result.riskRewardLabel || form.riskReward || "--"}。`
      : `${sideText} ${result.leverage}x：止盈价 ${formatUsdt(result.takeProfitPrice)}（回报率 ${formatNumber(result.takeProfitRoi)}%）。可填盈亏比自动算止损，或手填止损反推盈亏比。`
    : "输入开仓价后，用回报率算出止盈价；盈亏比默认 1:3，可与止损价互相换算。";

  useEffect(() => {
    if (!prefill) return;
    const nextSide = prefill.side || "long";
    const nextForm = { ...defaultForm, ...prefill.form };
    setSide(nextSide);
    setForm(
      nextForm.takeProfitPrice
        ? nextForm
        : syncTakeProfitFromRoi(nextForm, nextSide)
    );
  }, [prefill]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function changeSide(nextSide) {
    setSide(nextSide);
    setForm((current) => syncTakeProfitFromRoi(current, nextSide));
  }

  function changeEntryPrice(value) {
    setForm((current) => syncTakeProfitFromRoi({ ...current, entryPrice: value }, side));
  }

  function changeLeverage(value) {
    const normalized = value === "" ? "100" : value;
    setForm((current) => syncTakeProfitFromRoi({ ...current, leverage: normalized }, side));
  }

  function changeRoi(value) {
    setForm((current) => syncTakeProfitFromRoi({ ...current, targetRoi: value }, side));
  }

  function changeRiskReward(value) {
    setForm((current) => syncStopLossFromRiskReward({ ...current, riskReward: value }, side));
  }

  function changeTakeProfitPrice(value) {
    setForm((current) => {
      const next = { ...current, takeProfitPrice: value };
      const roi = calculateRoiFromPrice(current.entryPrice, current.leverage, value, side, "take");
      if (roi !== null) {
        next.targetRoi = formatRoiInput(roi);
      }
      return syncStopLossFromRiskReward(next, side);
    });
  }

  function changeStopLossPrice(value) {
    setForm((current) => {
      const next = { ...current, stopLossPrice: value };
      const multiple = calculateRiskRewardFromPrices(current.entryPrice, current.takeProfitPrice, value);
      if (multiple !== null) {
        next.riskReward = formatRiskRewardRatio(multiple);
      }
      return next;
    });
  }

  function quickRoi(value) {
    changeRoi(value);
  }

  function quickRiskReward(value) {
    changeRiskReward(value);
  }

  function stepRoi(delta) {
    const current = Number(form.targetRoi) || 0;
    const next = Math.max(0, current + delta);
    changeRoi(Number(next.toFixed(0)).toString());
  }

  function stepLeverage(delta) {
    const current = Number(form.leverage) || 0;
    const next = Math.max(1, current + delta);
    changeLeverage(Number(next.toFixed(0)).toString());
  }

  function clearForm() {
    setForm(syncTakeProfitFromRoi(defaultForm, side));
  }

  function saveContract() {
    if (!result) return;
    addHistory({
      screen: "contractRoi",
      side,
      form,
      isProfit: true,
      type: "止盈止损",
      title: sideText,
      summary: `止盈价：${formatUsdt(result.takeProfitPrice)}`,
      detail: [
        { label: "开仓价", value: formatUsdt(result.entryPrice) },
        { label: "当前价", value: result.currentPrice ? formatUsdt(result.currentPrice) : "--" },
        { label: "杠杆", value: `${result.leverage}x` },
        { label: "止盈价", value: formatUsdt(result.takeProfitPrice) },
        { label: "止盈回报率", value: `${formatNumber(result.takeProfitRoi)}%` },
        ...(result.hasStopLoss
          ? [
              { label: "止损价", value: formatUsdt(result.stopLossPrice) },
              { label: "止损亏损率", value: `-${formatNumber(result.stopLossRoi)}%` },
              { label: "盈亏比", value: result.riskRewardLabel || form.riskReward || "--" },
            ]
          : []),
        { label: "保证金", value: `${form.quantity || "--"} USDT` },
        { label: "名义仓位", value: result.notionalValue ? formatUsdt(result.notionalValue) : "--" },
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
              onChange={changeSide}
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
            <Field label="开仓价格（USDT）" value={form.entryPrice} onChangeText={changeEntryPrice} />
            <Field label="当前价格（USDT）" value={form.currentPrice} onChangeText={(value) => updateField("currentPrice", value)} />
            <StepField
              label="杠杆（默认 100x）"
              value={form.leverage || "100"}
              onChangeText={changeLeverage}
              onStepDown={() => stepLeverage(-1)}
              onStepUp={() => stepLeverage(1)}
            />
            <StepField
              label="目标回报率（%）"
              value={form.targetRoi}
              onChangeText={changeRoi}
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
            <Field label="止盈价格（USDT）" value={form.takeProfitPrice} onChangeText={changeTakeProfitPrice} />
            <Field
              label="盈亏比（默认 1:3）"
              value={form.riskReward}
              onChangeText={changeRiskReward}
              placeholder="1:3"
              keyboardType="default"
            />
            <View style={styles.quickRates}>
              {RISK_REWARD_QUICK.map((ratio) => {
                const active = form.riskReward === ratio;
                return (
                  <Pressable
                    key={ratio}
                    onPress={() => quickRiskReward(ratio)}
                    style={[styles.quickRate, active && styles.quickRateActive]}
                  >
                    <Text style={[styles.quickRateText, active && styles.quickRateTextActive]}>{ratio}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Field
              label="止损价格（USDT）"
              value={form.stopLossPrice}
              onChangeText={changeStopLossPrice}
              placeholder="改止损会反推盈亏比"
            />
            <Field label="保证金（USDT，可选）" value={form.quantity} onChangeText={(value) => updateField("quantity", value)} />
          </View>

          <View style={styles.feeRow}>
            <Text style={styles.feeChip}>盈亏比 1:3 = 收益是风险的 3 倍</Text>
            <Text style={styles.feeChip}>盈亏比越大止损越近，越小止损越远</Text>
            <Text style={styles.feeChip}>改盈亏比算止损，改止损反推盈亏比</Text>
          </View>
        </View>
      </View>

      <View style={{ width: isDesktop ? "48%" : "100%", maxWidth: isDesktop ? 420 : "100%" }}>
        <View style={styles.resultPanel}>
          <View style={[styles.triggerCard, styles.triggerCardGain]}>
            <Text style={styles.triggerCardLabel}>止盈触发价</Text>
            <Text style={[styles.triggerCardValue, styles.gapUpText]}>
              {result ? formatUsdt(result.takeProfitPrice) : "--"}
            </Text>
            <View style={styles.triggerMetaRow}>
              <Text style={[styles.triggerMetaText, styles.gapUpText]}>
                回报率 {result ? `+${formatNumber(result.takeProfitRoi)}%` : "--"}
              </Text>
              <Text style={[styles.triggerMetaText, result?.notionalValue ? styles.gapUpText : null]}>
                预计收益 {result?.notionalValue ? `+${formatUsdt(result.estimatedProfit)}` : "--"}
              </Text>
            </View>
            {result?.gapToTakeProfit ? (
              <View style={styles.triggerGapBlock}>
                <GapLine label="距当前价" gap={result.gapToTakeProfit} />
              </View>
            ) : (
              <Text style={styles.triggerGapHint}>填写当前价格后显示距止盈差距</Text>
            )}
          </View>

          <View style={styles.riskRewardDivider}>
            <View style={styles.riskRewardLine} />
            <View style={styles.riskRewardBadge}>
              <Text style={styles.riskRewardBadgeLabel}>盈亏比</Text>
              <Text style={styles.riskRewardBadgeValue}>
                {result?.riskRewardLabel || form.riskReward || "--"}
              </Text>
            </View>
            <View style={styles.riskRewardLine} />
          </View>

          <View style={[styles.triggerCard, styles.triggerCardLoss]}>
            <Text style={styles.triggerCardLabel}>止损触发价</Text>
            <Text style={[styles.triggerCardValue, result?.hasStopLoss ? styles.gapDownText : null]}>
              {result?.hasStopLoss ? formatUsdt(result.stopLossPrice) : "--"}
            </Text>
            <View style={styles.triggerMetaRow}>
              <Text style={[styles.triggerMetaText, result?.hasStopLoss ? styles.gapDownText : null]}>
                亏损率 {result?.hasStopLoss ? `-${formatNumber(result.stopLossRoi)}%` : "--"}
              </Text>
              <Text style={[styles.triggerMetaText, result?.hasStopLoss && result?.notionalValue ? styles.gapDownText : null]}>
                预计亏损{" "}
                {result?.hasStopLoss && result?.notionalValue
                  ? formatUsdt(result.estimatedLoss)
                  : "--"}
              </Text>
            </View>
            {result?.gapToStopLoss ? (
              <View style={styles.triggerGapBlock}>
                <GapLine label="距当前价" gap={result.gapToStopLoss} />
              </View>
            ) : (
              <Text style={styles.triggerGapHint}>
                {result?.hasStopLoss ? "填写当前价格后显示距止损差距" : "设置止损价后显示差距"}
              </Text>
            )}
          </View>

          <View style={styles.roiCardRow}>
            <View style={styles.roiCard}>
              <Text style={styles.roiCardLabel}>所需涨跌幅</Text>
              <Text style={styles.roiCardValue}>
                {result ? `${formatNumber(result.takeProfitMovePercent)}%` : "--"}
              </Text>
            </View>
            <View style={styles.roiCard}>
              <Text style={styles.roiCardLabel}>止盈价差</Text>
              <Text style={styles.roiCardValue}>
                {result ? formatUsdt(result.takeProfitMoveAmount) : "--"}
              </Text>
            </View>
          </View>

          <View style={styles.gapCard}>
            <Text style={styles.gapCardTitle}>当前持仓</Text>
            {result?.hasCurrentPrice ? (
              <View style={styles.roiCardRow}>
                <View
                  style={[
                    styles.roiCard,
                    result.currentRoi >= 0 ? styles.roiCardGain : styles.roiCardLoss,
                  ]}
                >
                  <Text style={styles.roiCardLabel}>当前投资回报率</Text>
                  <Text
                    style={[
                      styles.roiCardValue,
                      result.currentRoi >= 0 ? styles.gapUpText : styles.gapDownText,
                    ]}
                  >
                    {`${result.currentRoi >= 0 ? "+" : ""}${formatNumber(result.currentRoi)}%`}
                  </Text>
                </View>
                <View
                  style={[
                    styles.roiCard,
                    result.unrealizedPnl == null
                      ? null
                      : result.unrealizedPnl >= 0
                        ? styles.roiCardGain
                        : styles.roiCardLoss,
                  ]}
                >
                  <Text style={styles.roiCardLabel}>未实现盈亏</Text>
                  <Text
                    style={[
                      styles.roiCardValue,
                      result.unrealizedPnl == null
                        ? null
                        : result.unrealizedPnl >= 0
                          ? styles.gapUpText
                          : styles.gapDownText,
                    ]}
                  >
                    {result.unrealizedPnl == null
                      ? "填保证金后计算"
                      : `${result.unrealizedPnl >= 0 ? "+" : ""}${formatUsdt(result.unrealizedPnl)}`}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.gapEmpty}>填写当前价格后，显示未实现盈亏和当前回报率</Text>
            )}
          </View>

          <View style={styles.metrics}>
            <Metric label="名义仓位" value={result?.notionalValue ? formatUsdt(result.notionalValue) : "--"} />
            <Metric label="保证金" value={form.quantity ? `${form.quantity} USDT` : "--"} />
            <Metric label="方向" value={`${sideText} ${form.leverage || "--"}x`} />
            <Metric label="开仓价" value={result ? formatUsdt(result.entryPrice) : "--"} />
            <Metric label="当前价" value={result?.currentPrice ? formatUsdt(result.currentPrice) : "--"} />
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

function GapLine({ label, gap, spaced }) {
  const toneStyle = gap.direction === "up" ? styles.gapUpText : gap.direction === "down" ? styles.gapDownText : styles.gapValue;
  const sign = gap.direction === "up" ? "+" : gap.direction === "down" ? "-" : "";

  return (
    <>
      <View style={[styles.gapRow, spaced && styles.gapRowSpaced]}>
        <Text style={styles.gapLabel}>{label}</Text>
        <Text style={[styles.gapValue, toneStyle]}>
          {sign}
          {formatUsdt(gap.amount)}
        </Text>
      </View>
      <Text style={[styles.gapSub, toneStyle]}>
        {sign}
        {formatNumber(gap.percent)}%
      </Text>
    </>
  );
}
