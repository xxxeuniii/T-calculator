import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { calculateTrade } from "../../calculator";
import { formatCurrency, formatPrice } from "../../utils";
import styles from "./styles";
import Field from "../../components/common/Field";
import StepField from "../../components/common/StepField";
import Segment from "../../components/common/Segment";
import Metric from "../../components/common/Metric";

export default function TradeCalculator({ addHistory, prefill, isDesktop }) {
  const [mode, setMode] = useState("positive");
  const [form, setForm] = useState({
    costPrice: "",
    totalShares: "200",
    tradeShares: "100",
    sellPrice: "",
    buyPrice: "",
  });

  const result = useMemo(() => calculateTrade({ ...form, mode }), [form, mode]);

  const modeText = mode === "positive"
    ? { netLabel: "净利润", sellLabel: "卖出价", buyLabel: "买回价", actionText: "先卖后买", gainText: "盈利" }
    : { netLabel: "净利润", sellLabel: "买回价", buyLabel: "卖出价", actionText: "先买后卖", gainText: "盈利" };

  const formulaText = result
    ? mode === "positive"
      ? `净利润 = (卖出价 - 买回价) × 做T股数 - 总佣金 - 印花税
新成本价 = (持仓成本价 × 持仓股数 - 净利润) / 持仓股数`
      : `净利润 = (卖出价 - 买回价) × 做T股数 - 总佣金 - 印花税
新成本价 = (持仓成本价 × 持仓股数 + 净利润) / 持仓股数`
    : "输入价格和股数后自动计算做T结果。";

  useEffect(() => {
    if (!prefill) return;
    setMode(prefill.mode || "positive");
    setForm(prefill.form);
  }, [prefill]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleCostPriceChange(value) {
    if (/^[0-9]*\.?[0-9]*$/.test(value)) {
      updateField("costPrice", value);
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
      id: Date.now(),
      screen: "trade",
      mode,
      form,
      isProfit: result.netProfit > 0,
      type: "股票",
      time: new Date().toLocaleString("zh-CN"),
      title: mode === "positive" ? "正T" : "反T",
      summary: `${modeText.netLabel} ${formatCurrency(result.netProfit)}`,
      detail: [
        { label: modeText.sellLabel, value: form.sellPrice },
        { label: modeText.buyLabel, value: form.buyPrice },
        { label: "做T股数", value: form.tradeShares },
      ],
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
