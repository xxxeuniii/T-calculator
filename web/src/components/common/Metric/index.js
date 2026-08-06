import React from "react";
import { Text, View } from "react-native";
import styles from "./styles";

export default function Metric({ label, value, containerStyle, valueStyle }) {
  return (
    <View style={[styles.metric, containerStyle]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, valueStyle]}>{value}</Text>
    </View>
  );
}
