import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { calculateTrailingContract } from "../../calculator";
import { formatUsdt } from "../../utils";
import styles from "./styles";
import Field from "../common/Field";
import StepField from "../common/StepField";
import Segment from "../common/Segment";
import Metric from "../common/Metric";
import ProfitMetric from "../common/ProfitMetric";

export default function ContractCalculator({ addHistory, prefill, isDesktop }) {
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
      id: Date.now(),
      screen: "contract",
      side,
      form,
      isProfit: result.estimatedProfit > 0,
      type: "合约",
      time: new Date().toLocaleString("zh-CN"),
      title: sideText,
      summary: `预计止盈价 ${formatUsdt(result.expectedPrice)}`,
      detail: [
        { label: "成本价", value: `${formatUsdt(result.entryPrice)}` },
        { label: "激活价", value: `${formatUsdt(result.activationPrice)}` },
        { label: "回调率", value: `${result.callbackRate}%` },
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
