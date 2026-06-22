import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { fetchBalanceSheetAssets, fetchStockPrice } from "../api/stocks";

const hotStocks = [
  { code: "600519", name: "贵州茅台" },
  { code: "000858", name: "五粮液" },
  { code: "601318", name: "中国平安" },
  { code: "000001", name: "平安银行" },
  { code: "600036", name: "招商银行" },
  { code: "000651", name: "格力电器" },
];

function formatNumber(value, digits = 2) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "--";
}

function formatDate(value) {
  return value ? String(value).slice(0, 10) : "--";
}

function formatHundredMillion(value) {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return `${(safeValue / 100000000).toFixed(2)} 亿元`;
}

function MetricCard({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export default function PriceLookupScreen({ isDesktop }) {
  const [stockCode, setStockCode] = useState("600519");
  const [quote, setQuote] = useState(null);
  const [balanceAssets, setBalanceAssets] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function search(code) {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setQuote(null);
      setBalanceAssets(null);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [priceData, assetsData] = await Promise.all([
        fetchStockPrice(trimmedCode),
        fetchBalanceSheetAssets(trimmedCode),
      ]);
      setQuote(priceData);
      setBalanceAssets(assetsData);
    } catch (err) {
      setQuote(null);
      setBalanceAssets(null);
      setError(err?.message || "数据请求失败，请确认本地后端已启动");
    } finally {
      setLoading(false);
    }
  }

  function selectHotStock(code) {
    setStockCode(code);
    search(code);
  }

  return (
    <View style={[styles.container, { paddingHorizontal: isDesktop ? "8%" : 12 }]}>
      <View style={styles.searchPanel}>
        <View style={styles.searchRow}>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>股票代码</Text>
            <TextInput
              style={styles.input}
              placeholder="输入股票代码，如 600519"
              value={stockCode}
              onChangeText={setStockCode}
              onSubmitEditing={() => search(stockCode)}
              keyboardType="numeric"
              editable={!loading}
            />
          </View>
          <Pressable
            style={[styles.queryButton, loading && styles.loadingButton]}
            onPress={() => search(stockCode)}
            disabled={loading}
          >
            <Text style={styles.queryText}>{loading ? "查询中" : "查询"}</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.hotTitle}>热门股票</Text>
        <View style={styles.hotRow}>
          {hotStocks.map((stock) => (
            <Pressable
              key={stock.code}
              style={styles.hotChip}
              onPress={() => selectHotStock(stock.code)}
              disabled={loading}
            >
              <Text style={styles.hotText}>
                {stock.code} ({stock.name})
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {quote ? (
        <View style={styles.resultPanel}>
          <Text style={styles.stockTitle}>
            {quote.stock_name || quote.stock_code} ({quote.stock_code})
          </Text>
          <View style={styles.primaryResult}>
            <Text style={styles.primaryLabel}>当前股价</Text>
            <Text style={styles.primaryValue}>¥{formatNumber(quote.current_price)}</Text>
            <Text style={styles.sourceText}>数据源：{quote.source || "eastmoney"}</Text>
          </View>

          {balanceAssets ? (
            <>
              <Text style={styles.sectionTitle}>资产负债表：{formatDate(balanceAssets.report_date)}</Text>
              <View style={styles.metrics}>
                <MetricCard label="投资性房地产" value={formatHundredMillion(balanceAssets.investment_real_estate)} />
                <MetricCard label="在建工程" value={formatHundredMillion(balanceAssets.construction_in_progress)} />
                <MetricCard label="固定资产" value={formatHundredMillion(balanceAssets.fixed_asset)} />
                <MetricCard label="总资产" value={formatHundredMillion(balanceAssets.total_assets)} />
              </View>
            </>
          ) : null}
        </View>
      ) : (
        <View style={styles.emptyPanel}>
          <Text style={styles.emptyText}>输入股票代码后，从本地后端实时获取东方财富数据。</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  searchPanel: {
    paddingTop: 12,
    padding: 12,
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  inputWrap: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  queryButton: {
    height: 40,
    paddingHorizontal: 16,
    backgroundColor: "#1a73e8",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
  },
  loadingButton: {
    opacity: 0.65,
  },
  queryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  error: {
    color: "#d32f2f",
    fontSize: 14,
    marginBottom: 12,
  },
  hotTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  hotRow: {
    flexWrap: "wrap",
    flexDirection: "row",
    gap: 8,
  },
  hotChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f5f5f5",
    borderRadius: 999,
  },
  hotText: {
    fontSize: 13,
    color: "#333",
  },
  resultPanel: {
    marginTop: 12,
    padding: 12,
  },
  stockTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  primaryResult: {
    borderRadius: 8,
    padding: 18,
    backgroundColor: "#151515",
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
  sourceText: {
    color: "rgba(248, 255, 245, 0.78)",
    marginTop: 6,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 14,
    marginBottom: 8,
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metric: {
    flexBasis: "48%",
    flexGrow: 1,
    minWidth: 180,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e6e6e6",
  },
  metricLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  emptyPanel: {
    marginTop: 12,
    paddingVertical: 40,
    paddingHorizontal: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
});
