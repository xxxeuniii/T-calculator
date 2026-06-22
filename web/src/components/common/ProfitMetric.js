import React from "react";
import { Text, View } from "react-native";
import { formatUsdt } from "../../utils";
import styles from "../../styles";

export default function ProfitMetric({ value }) {
  const isPositive = value !== undefined && value >= 0;
  return (
    <View style={[styles.metric, isPositive ? styles.contractGainMetric : styles.contractLossMetric]}>
      <Text style={styles.metricLabel}>预计收益</Text>
      <Text style={[styles.metricValue, isPositive ? styles.contractGainText : styles.contractLossText]}>
        {value !== undefined ? `${isPositive ? "+" : ""}${formatUsdt(value)}` : "--"}
      </Text>
    </View>
  );
}