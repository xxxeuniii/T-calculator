import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { calculateMt5Liquidation } from "../../calculator";
import { formatUsdt } from "../../utils";
import styles from "./styles";
import Field from "../../components/common/Field";
import StepField from "../../components/common/StepField";
import Segment from "../../components/common/Segment";
import Metric from "../../components/common/Metric";

const LOT_QUICK = ["0.01", "0.10", "0.50", "1.00"];
const BALANCE_QUICK = ["100", "500", "1000", "5000"];

let _posId = 0;
const nextId = () => { _posId += 1; return `pos_${_posId}`; };

const defaultPosition = () => ({ id: nextId(), entryPrice: "", lotSize: "0.01" });

const defaultForm = {
  positions: [
    { id: nextId(), entryPrice: "", lotSize: "0.01" },
  ],
  balance: "",
  credit: "0",
  currentPrice: "",
};

const RISK_LABELS = {
  low: { text: "低风险", color: "#0f7b55", desc: "保证金水平 > 150%，账户资金充足" },
  medium: { text: "中风险", color: "#d48806", desc: "50% < 保证金水平 ≤ 150%，注意风险" },
  high: { text: "高风险", color: "#d32f2f", desc: "20% < 保证金水平 ≤ 50%，随时可能爆仓" },
  stopout: { text: "爆仓", color: "#d32f2f", desc: "保证金水平 ≤ 20%，持仓将被强制平仓" },
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

function aggregatePositions(positions) {
  let totalValue = 0;
  let totalLot = 0;
  for (const p of positions) {
    const price = Number(p.entryPrice) || 0;
    const lot = Number(p.lotSize) || 0;
    totalValue += price * lot;
    totalLot += lot;
  }
  const avgEntry = totalLot > 0 ? totalValue / totalLot : 0;
  return { avgEntry, totalLot };
}

export default function Mt5LiquidationScreen({ addHistory, prefill, isDesktop }) {
  const [side, setSide] = useState("long");
  const [form, setForm] = useState(defaultForm);
  const [showMarginHelp, setShowMarginHelp] = useState(false);

  const { avgEntry, totalLot } = useMemo(
    () => aggregatePositions(form.positions),
    [form.positions]
  );

  const result = useMemo(
    () =>
      calculateMt5Liquidation({
        entryPrice: avgEntry,
        lotSize: totalLot,
        balance: form.balance,
        credit: form.credit,
        currentPrice: form.currentPrice,
        side,
      }),
    [avgEntry, totalLot, form.balance, form.credit, form.currentPrice, side]
  );

  const sideText = side === "long" ? "做多" : "做空";

  useEffect(() => {
    if (!prefill) return;
    setSide(prefill.side || "long");
    if (prefill.form) {
      if (prefill.form.positions) {
        const positions = prefill.form.positions.map((p) => ({
          id: p.id || nextId(),
          entryPrice: p.entryPrice || "",
          lotSize: p.lotSize || "0.01",
        }));
        setForm({ ...defaultForm, ...prefill.form, positions });
      } else {
        setForm({
          ...defaultForm,
          balance: prefill.form.balance || defaultForm.balance,
          credit: prefill.form.credit || "",
          currentPrice: prefill.form.currentPrice || "",
          positions: [
            {
              id: nextId(),
              entryPrice: prefill.form.entryPrice || "",
              lotSize: prefill.form.lotSize || "0.01",
            },
          ],
        });
      }
    }
  }, [prefill]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updatePosition(index, key, value) {
    setForm((current) => {
      const positions = current.positions.map((p, i) =>
        i === index ? { ...p, [key]: value } : p
      );
      return { ...current, positions };
    });
  }

  function addPosition() {
    setForm((current) => ({
      ...current,
      positions: [...current.positions, defaultPosition()],
    }));
  }

  function removePosition(index) {
    setForm((current) => {
      if (current.positions.length <= 1) return current;
      const positions = current.positions.filter((_, i) => i !== index);
      return { ...current, positions };
    });
  }

  function changeSide(nextSide) {
    setSide(nextSide);
  }

  function stepLotSize(index, delta) {
    setForm((current) => {
      const positions = current.positions.map((p, i) => {
        if (i !== index) return p;
        const currentLot = Number(p.lotSize) || 0;
        const next = Math.max(0.01, Number((currentLot + delta).toFixed(2)));
        return { ...p, lotSize: next.toString() };
      });
      return { ...current, positions };
    });
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
    const posSummary = form.positions
      .map((p, i) => `#${i + 1}: ${formatUsdt(Number(p.entryPrice))} × ${p.lotSize}手`)
      .join("，");
    addHistory({
      screen: "mt5Liquidation",
      side,
      form,
      isProfit: false,
      type: "MT5强平",
      title: `${sideText} · ${form.positions.length}仓`,
      summary: `均价：${formatUsdt(avgEntry)}，强平：${formatUsdt(result.liquidationPrice)}`,
      detail: [
        { label: "加权均价", value: formatUsdt(avgEntry) },
        { label: "总手数", value: `${formatNumber(totalLot, 2)} 手` },
        { label: "仓位明细", value: posSummary },
        ...(result.hasCurrentPrice
          ? [
              { label: "净值", value: formatUsdt(result.equity) },
              {
                label: "浮动盈亏",
                value: `${result.floatingPnl >= 0 ? "+" : ""}${formatUsdt(result.floatingPnl)}`,
              },
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
  const formatU = (v) => {
    const s = formatUsdt(v);
    return s === "--" ? "--" : s.replace(/ USDT$/, " U");
  };
  const riskCardBg =
    result?.hasCurrentPrice
      ? ({
          low: "#eefbf4",
          medium: "#fff7e0",
          high: "#fff1f0",
          stopout: "#fff1f2",
          unknown: "#ffffff",
        }[result.riskLevel] || "#ffffff")
      : "#ffffff";

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
            <View style={styles.positionCard}>
              <View style={styles.positionCardHeader}>
                <Text style={styles.positionCardTitle}>仓位 ({form.positions.length})</Text>
                <View style={styles.positionCardHeaderRight}>
                  <Text style={styles.positionTotalLot}>
                    合计 {formatNumber(totalLot, 2)} 手
                  </Text>
                  <Pressable onPress={addPosition} style={styles.addPositionButton}>
                    <Text style={styles.addPositionText}>+ 添加仓位</Text>
                  </Pressable>
                </View>
              </View>

              {form.positions.map((pos, index) => (
                <View key={pos.id} style={styles.positionItem}>
                  <View style={styles.positionItemHeader}>
                    <Text style={styles.positionItemLabel}>#{index + 1} 仓</Text>
                    {form.positions.length > 1 ? (
                      <Pressable onPress={() => removePosition(index)} style={styles.removePositionButton}>
                        <Text style={styles.removePositionText}>删除</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <Field
                    label="开仓价格 (USD)"
                    value={pos.entryPrice}
                    onChangeText={(value) => updatePosition(index, "entryPrice", value)}
                  />
                  <StepField
                    label="交易手数"
                    value={pos.lotSize}
                    onChangeText={(value) => updatePosition(index, "lotSize", value)}
                    onStepDown={() => stepLotSize(index, -0.01)}
                    onStepUp={() => stepLotSize(index, 0.01)}
                  />
                  <View style={styles.quickRates}>
                    {LOT_QUICK.map((value) => {
                      const active = pos.lotSize === value;
                      return (
                        <Pressable
                          key={value}
                          onPress={() => updatePosition(index, "lotSize", value)}
                          style={[styles.quickRate, active && styles.quickRateActive]}
                        >
                          <Text style={[styles.quickRateText, active && styles.quickRateTextActive]}>{value}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}

              {totalLot > 0 ? (
                <View style={styles.avgCostRow}>
                  <Text style={styles.avgCostLabel}>加权均价</Text>
                  <Text style={styles.avgCostValue}>{formatUsdt(avgEntry)}</Text>
                </View>
              ) : null}
            </View>

            <StepField
              label="账户余额"
              value={form.balance}
              onChangeText={(value) => updateField("balance", value)}
              onStepDown={() => stepBalance(-10)}
              onStepUp={() => stepBalance(10)}
            />

            <Field
              label="当前价格"
              value={form.currentPrice}
              onChangeText={(value) => updateField("currentPrice", value)}
              placeholder="选填，计算保证金水平"
            />
            <View style={styles.feeRow}>
              <View style={styles.feeChip}>
                <Text style={styles.feeChipTitle}>占用保证金 = 开仓价 × 手数 × 合约规模 ÷ 杠杆</Text>
                <View style={styles.feeChipDivider} />
                <Text style={styles.feeChipBody}>
                  <Text style={styles.feeChipResultHighlight}>{result ? formatU(result.usedMargin) : "--"}</Text>
                  {" = "}{formatU(avgEntry)} × {formatNumber(totalLot, 2)} 手 × 100 ÷ 500
                </Text>
              </View>
              <View style={styles.feeChip}>
                <Text style={styles.feeChipTitle}>净值 = 余额 + 信用额 + 浮动盈亏</Text>
                <View style={styles.feeChipDivider} />
                <Text style={styles.feeChipBody}>
                  {result?.hasCurrentPrice ? formatU(result.equity) : formatU((result?.balance || 0) + (result?.credit || 0))}
                  {" = "}{formatU(result?.balance)} + {formatU(result?.credit)}
                  {result?.hasCurrentPrice
                    ? ` ${result.floatingPnl >= 0 ? "+" : "−"} ${formatU(Math.abs(result.floatingPnl))}`
                    : ""}
                </Text>
              </View>
              <View style={styles.feeChip}>
                <Text style={styles.feeChipTitle}>保证金水平 = 净值 ÷ 占用保证金 × 100%</Text>
                <View style={styles.feeChipDivider} />
                <Text style={styles.feeChipBody}>
                  <Text style={result?.hasCurrentPrice && result.marginLevel != null ? { color: risk.color, fontWeight: "900" } : undefined}>
                    {result?.hasCurrentPrice && result.marginLevel != null ? `${formatNumber(result.marginLevel)}%` : "--"}
                  </Text>
                  {" = "}{result?.hasCurrentPrice ? formatU(result.equity) : "--"}
                  ÷ {result ? formatU(result.usedMargin) : "--"} × 100%
                </Text>
              </View>
              {result ? (
                <View style={styles.feeChip}>
                  <Text style={styles.feeChipTitle}>
                    {side === "long"
                      ? "强平价 = 开仓价 × 0.9984 − (余额 + 信用额) ÷ (手数 × 合约规模)"
                      : "强平价 = 开仓价 × 1.0016 + (余额 + 信用额) ÷ (手数 × 合约规模)"}
                  </Text>
                  <View style={styles.feeChipDivider} />
                  <Text style={styles.feeChipBody}>
                    {formatU(result.liquidationPrice)}
                    {" = "}{formatU(avgEntry)} × {side === "long" ? "0.9984" : "1.0016"}
                    {` ${side === "long" ? "−" : "+"} ${formatU((result?.balance || 0) + (result?.credit || 0))} ÷ ${formatNumber((totalLot || 0) * 100, 2)}`}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      <View style={{ width: isDesktop ? "48%" : "100%", maxWidth: isDesktop ? 420 : "100%" }}>
        <View style={styles.resultPanel}>
          {result?.hasCurrentPrice ? (
            <Pressable
              style={[
                styles.triggerCard,
                {
                  borderColor: risk.color,
                },
              ]}
              onPress={() => setShowMarginHelp(true)}
            >
              <View style={styles.marginCardHeader}>
                <Text style={[styles.triggerCardLabel, { color: risk.color }]}>保证金水平</Text>
                <Text style={[styles.marginCardHelpIcon, { color: risk.color }]}>ⓘ</Text>
              </View>
              <View style={styles.marginLevelRow}>
                <Text style={[styles.triggerCardValue, { color: risk.color }]}>
                  {result.marginLevel != null ? `${formatNumber(result.marginLevel)}%` : "--"}
                </Text>
                <View style={[styles.riskBadge, { borderColor: risk.color }]}>
                  <Text style={[styles.riskBadgeText, { color: risk.color }]}>{risk.text}</Text>
                </View>
              </View>
              <Text style={[styles.riskDesc, { color: risk.color, opacity: 0.9 }]}>{risk.desc}</Text>
            </Pressable>
          ) : null}

          <View style={[styles.triggerCard, styles.triggerCardSpaced]}>
            <Text style={styles.triggerCardLabel}>强平价</Text>
            <Text style={[styles.triggerCardValue, styles.gapDownText]}>
              {result ? formatUsdt(result.liquidationPrice) : "--"}
            </Text>
            {result?.hasCurrentPrice && (result.gapToLiquidation?.reached || result.gapToLiquidation?.direction === "flat") ? (
              <View style={styles.triggerReachedHint}>
                <Text style={styles.triggerReachedText}>当前价格已到强平价</Text>
              </View>
            ) : (
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
            )}
          </View>

          {result?.hasCurrentPrice ? (
            <View style={[styles.gapCard, styles.triggerCardSpaced]}>
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
            <Metric label="占用保证金" value={result ? formatUsdt(result.usedMargin) : "--"} valueStyle={{ color: "#d32f2f" }} />
            <Metric label="方向" value={sideText} />
            <Metric label="总手数" value={result ? `${formatNumber(totalLot, 2)} 手` : "--"} />
            <Metric label="加权均价" value={result ? formatUsdt(avgEntry) : "--"} />
            {result?.hasCurrentPrice ? (
              <>
                <Metric label="可用保证金" value={formatUsdt(result.availableMargin)} />
                <Metric
                  label="保证金水平"
                  value={result ? `${formatNumber(result.marginLevel)}%` : "--"}
                  valueStyle={result?.hasCurrentPrice && result.marginLevel != null ? { color: risk.color, fontWeight: "900" } : undefined}
                />
              </>
            ) : null}
            <Metric label="余额" value={form.balance ? formatUsdt(result?.balance) : "--"} />
          </View>

          <Pressable onPress={saveLiquidation} style={[styles.confirmButton, !result && styles.disabledButton]}>
            <Text style={styles.confirmText}>确认并存入历史</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={showMarginHelp}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMarginHelp(false)}
      >
        <View style={styles.marginHelpOverlay}>
          <Pressable style={styles.marginHelpBackdrop} onPress={() => setShowMarginHelp(false)} />
          <View style={styles.marginHelpSheet}>
            <View style={styles.marginHelpHeader}>
              <Text style={styles.marginHelpTitle}>保证金水平说明</Text>
              <Pressable onPress={() => setShowMarginHelp(false)} style={styles.marginHelpCloseBtn}>
                <Text style={styles.marginHelpCloseText}>关闭</Text>
              </Pressable>
            </View>

            <View style={styles.marginHelpSection}>
              <Text style={styles.marginHelpSectionTitle}>计算公式</Text>
              <View style={styles.feeChip}>
                <Text style={styles.feeChipTitle}>占用保证金 = 开仓价 × 手数 × 合约规模 ÷ 杠杆</Text>
                <View style={styles.feeChipDivider} />
                <Text style={styles.feeChipBody}>
                  <Text style={styles.feeChipResultHighlight}>{result ? formatU(result.usedMargin) : "--"}</Text>
                  {" = "}{formatU(avgEntry)} × {formatNumber(totalLot, 2)} 手 × 100 ÷ 500
                </Text>
              </View>
              <View style={[styles.feeChip, { marginTop: 10 }]}>
                <Text style={styles.feeChipTitle}>净值 = 余额 + 信用额 + 浮动盈亏</Text>
                <View style={styles.feeChipDivider} />
                <Text style={styles.feeChipBody}>
                  {result?.hasCurrentPrice ? formatU(result.equity) : formatU((result?.balance || 0) + (result?.credit || 0))}
                  {" = "}{formatU(result?.balance)} + {formatU(result?.credit)}
                  {result?.hasCurrentPrice
                    ? ` ${result.floatingPnl >= 0 ? "+" : "−"} ${formatU(Math.abs(result.floatingPnl))}`
                    : ""}
                </Text>
              </View>
              <View style={[styles.feeChip, { marginTop: 10 }]}>
                <Text style={styles.feeChipTitle}>保证金水平 = 净值 ÷ 占用保证金 × 100%</Text>
                <View style={styles.feeChipDivider} />
                <Text style={styles.feeChipBody}>
                  <Text style={result?.hasCurrentPrice && result.marginLevel != null ? { color: risk.color, fontWeight: "900" } : undefined}>
                    {result?.hasCurrentPrice && result.marginLevel != null ? `${formatNumber(result.marginLevel)}%` : "--"}
                  </Text>
                  {" = "}{result?.hasCurrentPrice ? formatU(result.equity) : "--"}
                  ÷ {result ? formatU(result.usedMargin) : "--"} × 100%
                </Text>
              </View>
            </View>

            <View style={styles.marginHelpSection}>
              <Text style={styles.marginHelpSectionTitle}>强平价系数来源（MT5 500 倍杠杆）</Text>
              <View style={styles.feeChip}>
                <Text style={styles.feeChipTitle}>做多 0.9984 / 做空 1.0016 的推导</Text>
                <View style={styles.feeChipDivider} />
                <Text style={styles.feeChipBody}>• stopOutLevel = 20%（MT5 强平线：保证金水平 ≤ 20% 就爆仓）</Text>
                <Text style={[styles.feeChipBody, { marginTop: 2 }]}>• drainRatio = 1 − 20% = 80%（占用保证金最多允许亏掉 80%）</Text>
                <Text style={[styles.feeChipBody, { marginTop: 2 }]}>• priceMoveRatio = 80% ÷ 500 = 0.16%（换算成价格：最大允许反向波动 0.16%）</Text>
                <Text style={[styles.feeChipBody, { marginTop: 2 }]}>
                  • 做多：1 − 0.16% = 1 − 0.0016 = <Text style={styles.feeChipEmph}>0.9984</Text>（开仓价最多跌 0.16%）
                </Text>
                <Text style={[styles.feeChipBody, { marginTop: 2 }]}>
                  • 做空：1 + 0.16% = 1 + 0.0016 = <Text style={styles.feeChipEmph}>1.0016</Text>（开仓价最多涨 0.16%）
                </Text>
              </View>
            </View>

            <View style={styles.marginHelpSection}>
              <Text style={styles.marginHelpSectionTitle}>风险等级</Text>

              <View style={styles.marginHelpRiskRow}>
                <View style={[styles.marginHelpRiskDot, { backgroundColor: "#0f7b55" }]} />
                <View style={styles.marginHelpRiskContent}>
                  <Text style={styles.marginHelpRiskLevel}>
                    低风险（保证金水平 {">"} 150%）
                  </Text>
                  <Text style={styles.marginHelpRiskDesc}>
                    账户有足够的资金来维持当前的持仓，不处于爆仓的风险中。
                  </Text>
                </View>
              </View>

              <View style={styles.marginHelpRiskRow}>
                <View style={[styles.marginHelpRiskDot, { backgroundColor: "#d48806" }]} />
                <View style={styles.marginHelpRiskContent}>
                  <Text style={styles.marginHelpRiskLevel}>
                    中风险（50% {"<"} 保证金水平 ≤ 150%）
                  </Text>
                  <Text style={styles.marginHelpRiskDesc}>
                    账户可用保证金越来越少。您需要关注账户风险。
                  </Text>
                </View>
              </View>

              <View style={styles.marginHelpRiskRow}>
                <View style={[styles.marginHelpRiskDot, { backgroundColor: "#d32f2f" }]} />
                <View style={styles.marginHelpRiskContent}>
                  <Text style={styles.marginHelpRiskLevel}>
                    高风险（20% {"<"} 保证金水平 ≤ 50%）
                  </Text>
                  <Text style={styles.marginHelpRiskDesc}>
                    账户可用保证金越来越少。为避免爆仓，您可能需要存入额外资金或平部分仓位。
                  </Text>
                </View>
              </View>

              <View style={styles.marginHelpRiskRow}>
                <View style={[styles.marginHelpRiskDot, { backgroundColor: RISK_LABELS.stopout.color }]} />
                <View style={styles.marginHelpRiskContent}>
                  <Text style={[styles.marginHelpRiskLevel, { color: RISK_LABELS.stopout.color }]}>
                    爆仓（保证金水平 ≤ 20%）
                  </Text>
                  <Text style={styles.marginHelpRiskDesc}>
                    如果保证金水平低于 20%，您的持仓将自动关闭，从最大亏损的持仓开始（如果有多个持仓）。
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
