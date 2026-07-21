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
const MARGIN_QUICK = ["5", "10", "15", "20"];

const defaultForm = {
  entryPrice: "66714.9",
  currentPrice: "66660",
  leverage: "100",
  targetRoi: "100",
  riskReward: "1:3",
  takeProfitPrice: "",
  stopLossPrice: "",
  quantity: "10",
};

function HoverTip({ text, accessibilityLabel = "说明" }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.hoverTipWrap}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        style={styles.hoverTipTrigger}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <Text style={styles.hoverTipTriggerText}>?</Text>
      </Pressable>
      {open ? (
        <View style={styles.hoverTipBubble} pointerEvents="none">
          <Text style={styles.hoverTipText}>{text}</Text>
        </View>
      ) : null}
    </View>
  );
}

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
    quantity: form.quantity === "" || form.quantity === undefined ? "10" : form.quantity,
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

  function stepQuantity(delta) {
    const current = Number(form.quantity) || 0;
    const next = Math.max(0, current + delta);
    updateField("quantity", Number(next.toFixed(2)).toString());
  }

  function quickQuantity(value) {
    updateField("quantity", value);
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
            <Field label="开仓价格" value={form.entryPrice} onChangeText={changeEntryPrice} />
            <Field label="当前价格" value={form.currentPrice} onChangeText={(value) => updateField("currentPrice", value)} />
            <Field label="杠杆" value={form.leverage} onChangeText={changeLeverage} placeholder="默认 100" />
            <StepField
              label="保证金"
              value={form.quantity}
              onChangeText={(value) => updateField("quantity", value)}
              onStepDown={() => stepQuantity(-1)}
              onStepUp={() => stepQuantity(1)}
            />
            <View style={styles.quickRates}>
              {MARGIN_QUICK.map((amount) => {
                const active = form.quantity === amount;
                return (
                  <Pressable
                    key={amount}
                    onPress={() => quickQuantity(amount)}
                    style={[styles.quickRate, active && styles.quickRateActive]}
                  >
                    <Text style={[styles.quickRateText, active && styles.quickRateTextActive]}>{amount}</Text>
                  </Pressable>
                );
              })}
            </View>
            <StepField
              label="目标回报率"
              labelAccessory={
                <HoverTip
                  text="可与止盈价格互相换算"
                  accessibilityLabel="目标回报率说明"
                />
              }
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
            <Field label="止盈价格" value={form.takeProfitPrice} onChangeText={changeTakeProfitPrice} />
            <Field
              label="盈亏比"
              labelAccessory={
                <HoverTip
                  text="可与止损价格互相换算。盈亏比越大止损越近，越小止损越远"
                  accessibilityLabel="盈亏比说明"
                />
              }
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
              label="止损价格"
              value={form.stopLossPrice}
              onChangeText={changeStopLossPrice}
            />
          </View>
        </View>
      </View>

      <View style={{ width: isDesktop ? "48%" : "100%", maxWidth: isDesktop ? 420 : "100%" }}>
        <View style={styles.resultPanel}>
          <View style={[styles.triggerCard, styles.triggerCardGain]}>
            <View style={styles.triggerHeroRow}>
              <Text style={styles.triggerKvKey}>止盈触发价</Text>
              <Text style={[styles.triggerHeroValue, styles.gapUpText]}>
                {result ? formatUsdt(result.takeProfitPrice) : "--"}
              </Text>
            </View>
            <View style={styles.triggerKvList}>
              <KvRow
                label="回报率"
                value={result ? `+${formatNumber(result.takeProfitRoi)}%` : "--"}
              />
              <KvRow
                label="预计收益"
                value={result?.notionalValue ? `+${formatUsdt(result.estimatedProfit)}` : "--"}
                valueStyle={result?.notionalValue ? styles.gapUpText : null}
              />
              {result ? (
                <GapKvRows
                  label="距开仓价"
                  price={formatUsdt(result.entryPrice)}
                  gap={buildEntryGap(result.entryPrice, result.takeProfitPrice)}
                  spaced
                />
              ) : null}
              {result?.gapToTakeProfit ? (
                <GapKvRows
                  label={reachLabel("止盈", result.gapToTakeProfit.direction)}
                  gap={result.gapToTakeProfit}
                  spaced
                  signed={false}
                />
              ) : null}
            </View>
          </View>

          <View style={styles.riskRewardDivider}>
            <View style={styles.riskRewardLine} />
            <View style={styles.riskRewardBadge}>
              <Text style={styles.riskRewardBadgeLabel}>盈亏比</Text>
              <Text style={styles.riskRewardBadgeValue} numberOfLines={1}>
                {result?.riskRewardLabel || form.riskReward || "--"}
              </Text>
            </View>
            <View style={styles.riskRewardLine} />
          </View>

          <View style={[styles.triggerCard, styles.triggerCardLoss]}>
            <View style={styles.triggerHeroRow}>
              <Text style={styles.triggerKvKey}>止损触发价</Text>
              <Text
                style={[
                  styles.triggerHeroValue,
                  result?.hasStopLoss ? styles.gapDownText : null,
                ]}
              >
                {result?.hasStopLoss ? formatUsdt(result.stopLossPrice) : "--"}
              </Text>
            </View>
            <View style={styles.triggerKvList}>
              <KvRow
                label="亏损率"
                value={result?.hasStopLoss ? `-${formatNumber(result.stopLossRoi)}%` : "--"}
              />
              <KvRow
                label="预计亏损"
                value={
                  result?.hasStopLoss && result?.notionalValue
                    ? formatUsdt(result.estimatedLoss)
                    : "--"
                }
                valueStyle={
                  result?.hasStopLoss && result?.notionalValue ? styles.gapDownText : null
                }
              />
              {result?.hasStopLoss ? (
                <>
                  <GapKvRows
                    label="距开仓价"
                    price={formatUsdt(result.entryPrice)}
                    gap={buildEntryGap(result.entryPrice, result.stopLossPrice)}
                    spaced
                  />
                  {result.gapToStopLoss ? (
                    <GapKvRows
                      label={reachLabel("止损", result.gapToStopLoss.direction)}
                      gap={result.gapToStopLoss}
                      spaced
                      signed={false}
                    />
                  ) : null}
                </>
              ) : (
                <Text style={styles.triggerGapHintInline}>设置止损价后显示差距</Text>
              )}
            </View>
          </View>

          <View style={[styles.gapCard, styles.triggerCardSpaced]}>
            <Text style={styles.gapCardTitle}>当前持仓</Text>
            {result?.hasCurrentPrice ? (
              <View style={styles.roiCardRow}>
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
              </View>
            ) : (
              <Text style={styles.gapEmpty}>填写当前价格后，显示未实现盈亏和当前回报率</Text>
            )}
          </View>

          <View style={styles.metrics}>
            <Metric label="名义仓位" value={result?.notionalValue ? formatUsdt(result.notionalValue) : "--"} />
            <Metric label="保证金" value={form.quantity ? `${form.quantity} USDT` : "--"} />
          </View>

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

function buildEntryGap(entryPrice, targetPrice) {
  const diff = targetPrice - entryPrice;
  return {
    amount: Math.abs(diff),
    percent: entryPrice ? (Math.abs(diff) / entryPrice) * 100 : 0,
    direction: diff > 0 ? "up" : diff < 0 ? "down" : "flat",
  };
}

function reachLabel(targetName, direction) {
  if (direction === "up") return `到${targetName}还需涨`;
  if (direction === "down") return `到${targetName}还需跌`;
  return `已到${targetName}`;
}

function formatGapAmount(gap, { signed = true } = {}) {
  const sign = signed ? (gap.direction === "up" ? "+" : gap.direction === "down" ? "-" : "") : "";
  return `${sign}${formatUsdt(gap.amount)}`;
}

function formatGapPercent(gap, { signed = true } = {}) {
  const sign = signed ? (gap.direction === "up" ? "+" : gap.direction === "down" ? "-" : "") : "";
  return `${sign}${formatNumber(gap.percent)}%`;
}

function GapKvRows({ label, price, gap, spaced, signed = true }) {
  return (
    <View style={[styles.triggerKvRow, spaced && styles.triggerKvRowSpaced]}>
      <View style={styles.triggerKvKeyStack}>
        <Text style={styles.triggerKvKey}>{label}</Text>
        {price ? <Text style={styles.triggerKvPrice}>{price}</Text> : null}
      </View>
      <View style={styles.triggerKvValueStack}>
        <Text style={styles.triggerKvPercent}>{formatGapPercent(gap, { signed })}</Text>
        <Text style={styles.triggerKvValue}>{formatGapAmount(gap, { signed })}</Text>
      </View>
    </View>
  );
}

function KvRow({ label, value, spaced, valueStyle }) {
  return (
    <View style={[styles.triggerKvRow, spaced && styles.triggerKvRowSpaced]}>
      <Text style={styles.triggerKvKey}>{label}</Text>
      <Text style={[styles.triggerKvValue, valueStyle && styles.triggerKvValueAccent, valueStyle]}>
        {value}
      </Text>
    </View>
  );
}
