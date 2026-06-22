import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { formatCurrency, formatPrice, formatPercent } from "../utils";
import { getStockPrice, getBalanceSheetAssets, getIncomeStatement, getValuationMethod, getFinancialData, getCompoundGrowth, getStockPrediction } from "../eastmoneyClient";
import styles, { palette } from "../styles";
import Field from "./common/Field";
import Metric from "./common/Metric";

const hotStocks = [
  { code: "600519", name: "贵州茅台" },
  { code: "000858", name: "五粮液" },
  { code: "601318", name: "中国平安" },
  { code: "000001", name: "平安银行" },
  { code: "000651", name: "格力电器" },
  { code: "000333", name: "美的集团" },
  { code: "600036", name: "招商银行" },
  { code: "002594", name: "比亚迪" },
];

function formatHundredMillion(value) {
  return typeof value === "number" ? `${(value / 100000000).toFixed(2)} 亿元` : "--";
}

function formatYi(value) {
  return typeof value === "number" ? `${value.toFixed(2)} 亿元` : "--";
}

export default function ValuationScreen({ isDesktop }) {
  const [stockCode, setStockCode] = useState("");
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (stockCode.length === 6) {
      fetchStockData(stockCode);
    }
  }, [stockCode]);

  async function fetchStockData(code) {
    setLoading(true);
    setError(null);
    
    try {
      const promises = [
        getStockPrice(code),
        getBalanceSheetAssets(code),
        getIncomeStatement(code),
        getValuationMethod(code),
        getFinancialData(code),
        getCompoundGrowth(code),
        getStockPrediction(code),
      ];
      
      const [
        priceData,
        balanceAssets,
        incomeStatement,
        valuation,
        financialData,
        compoundGrowth,
        prediction,
      ] = await Promise.all(promises);

      const mergedData = {
        name: priceData.name || "未知股票",
        price: priceData.price,
        change: priceData.change,
        changePercent: priceData.changePercent,
        balanceAssets: balanceAssets,
        incomeStatement: incomeStatement,
        valuation: valuation,
        financialData: {
          ...financialData,
          compoundRevenueGrowth: compoundGrowth.compoundRevenueGrowth,
          compoundProfitGrowth: compoundGrowth.compoundProfitGrowth,
        },
        prediction: prediction,
      };

      setStockData(mergedData);
    } catch (e) {
      setError("获取数据失败，请稍后重试");
      setStockData(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(code) {
    const cleaned = code.replace(/\D/g, "");
    if (cleaned.length <= 6) {
      setStockCode(cleaned);
    }
  }

  function selectStock(stock) {
    setStockCode(stock.code);
  }

  const predictionData = stockData?.prediction?.data || stockData?.prediction || {};
  const baseYear = predictionData.base_year || "--";
  const predictedYear = predictionData.predicted_year || "--";

  if (loading) {
    return (
      <View style={{ padding: 20, alignItems: "center" }}>
        <Text style={{ color: palette.muted }}>加载中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ padding: 20, alignItems: "center" }}>
        <Text style={{ color: palette.profitRed }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={{ width: isDesktop ? "100%" : "100%" }}>
      <View style={styles.panel}>
        <View style={{ marginBottom: 16 }}>
          <Field
            label="股票代码"
            value={stockCode}
            placeholder="输入6位股票代码"
            onChangeText={handleSearch}
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={[styles.fieldLabel, { marginBottom: 10 }]}>热门股票</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {hotStocks.map((stock) => (
              <Pressable
                key={stock.code}
                onPress={() => selectStock(stock)}
                style={[
                  styles.feeChip,
                  stockCode === stock.code && {
                    backgroundColor: palette.ink,
                    borderColor: palette.ink,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.feeChip,
                    stockCode === stock.code && { color: "#f8fff5" },
                  ]}
                >
                  {stock.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {stockData && (
          <>
            <View style={{ marginBottom: 16 }}>
              <View style={[styles.primaryResult, stockData.change >= 0 ? styles.primaryGain : styles.primaryLoss]}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={styles.primaryLabel}>{stockData.name} ({stockCode})</Text>
                  <Text style={{ color: "#f8fff5", fontSize: 14, fontWeight: "700" }}>
                    {stockData.change >= 0 ? "+" : ""}{stockData.changePercent?.toFixed(2) || "--"}%
                  </Text>
                </View>
                <Text style={styles.primaryValue}>{formatPrice(stockData.price)}</Text>
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: palette.ink, fontSize: 16, fontWeight: "900" }}>
                  {predictedYear !== "--" ? `${predictedYear}年预测股价` : "预测股价"}
                </Text>
              </View>
              <View style={styles.metrics}>
                <Metric
                  label="市销率法"
                  value={formatPrice(predictionData.predicted_price_ps)}
                  containerStyle={{ backgroundColor: "rgba(15, 123, 85, 0.08)", borderColor: "rgba(15, 123, 85, 0.38)" }}
                  valueStyle={{ color: palette.lossGreen }}
                />
                <Metric
                  label="市盈率法"
                  value={formatPrice(predictionData.predicted_price_pe)}
                  containerStyle={{ backgroundColor: "rgba(182, 48, 48, 0.08)", borderColor: "rgba(182, 48, 48, 0.34)" }}
                  valueStyle={{ color: palette.profitRed }}
                />
              </View>
              <Text style={styles.formula}>
                市销率法 = (市值/基准年营收) × 预测年营收 / 总股本
                {"\n"}市盈率法 = 预测年净利润 × (当前股价/基准年EPS) / 总股本
              </Text>
            </View>

            <View style={{ marginBottom: 16 }}>
              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: palette.ink, fontSize: 16, fontWeight: "900" }}>预测计算依据</Text>
              </View>
              <View style={styles.metrics}>
                <Metric label={`${baseYear}年营收`} value={formatYi(predictionData.revenue_base)} />
                <Metric label="综合复合营收增速" value={formatPercent(stockData.financialData?.compoundRevenueGrowth)} />
                <Metric label={`${predictedYear}预测营收`} value={formatYi(predictionData.predicted_revenue)} />
                <Metric label={`${baseYear}年净利润`} value={formatYi(predictionData.net_profit_base)} />
                <Metric label="综合复合净利润增速" value={formatPercent(stockData.financialData?.compoundProfitGrowth)} />
                <Metric label={`${predictedYear}预测净利润`} value={formatYi(predictionData.predicted_net_profit)} />
                <Metric label="总股本(亿)" value={stockData.valuation?.totalShare ? (stockData.valuation.totalShare / 100000000).toFixed(2) : "--"} />
                <Metric label="当前PE" value={stockData.valuation?.pe ? stockData.valuation.pe.toFixed(2) : "--"} />
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: palette.ink, fontSize: 16, fontWeight: "900" }}>财务概览</Text>
              </View>
              <View style={styles.metrics}>
                <Metric label="总市值" value={formatHundredMillion(stockData.valuation?.marketCap)} />
                <Metric label="总资产" value={formatHundredMillion(stockData.balanceAssets?.totalAssets)} />
                <Metric label="净资产" value={formatHundredMillion(stockData.balanceAssets?.netAssets)} />
                <Metric label="每股收益" value={stockData.incomeStatement?.eps ? `${stockData.incomeStatement.eps.toFixed(2)} 元` : "--"} />
                <Metric label="PS" value={stockData.valuation?.ps ? stockData.valuation.ps.toFixed(2) : "--"} />
                <Metric label="营收同比" value={formatPercent(stockData.financialData?.revenueGrowth)} />
                <Metric label="净利润同比" value={formatPercent(stockData.financialData?.profitGrowth)} />
              </View>
            </View>
          </>
        )}

        {!stockData && stockCode.length === 6 && (
          <View style={{ padding: 20, alignItems: "center" }}>
            <Text style={{ color: palette.muted }}>暂无数据</Text>
          </View>
        )}
      </View>
    </View>
  );
}
