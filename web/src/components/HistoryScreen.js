import React from "react";
import { View, Text, Pressable } from "react-native";
import styles from "../styles";

export default function HistoryScreen({ history, onSelect, onClear }) {
  if (!history || history.length === 0) {
    return (
      <View style={{ width: "100%", padding: 20 }}>
        <Text style={styles.emptyText}>暂无历史记录</Text>
      </View>
    );
  }

  return (
    <View style={{ width: "100%" }}>
      <View style={styles.panel}>
        <View style={styles.historyHeader}>
          <Text style={{ color: styles.panel.color, fontSize: 16, fontWeight: "900" }}>
            历史记录 ({history.length})
          </Text>
          <Pressable onPress={onClear} style={styles.clearButton}>
            <Text style={styles.clearText}>清空</Text>
          </Pressable>
        </View>

        <View style={{ gap: 10 }}>
          {history.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onSelect(item)}
              style={[
                styles.historyItem,
                item.isProfit && styles.historyProfitItem,
              ]}
            >
              <View style={styles.historyItemTop}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={styles.historyType}>{item.type}</Text>
                  <Text style={{ color: "#999", fontSize: 12 }}>{item.title}</Text>
                </View>
                <Text style={styles.historyTime}>{item.time}</Text>
              </View>
              <View style={{ marginTop: 8 }}>
                <Text style={{ color: "#151515", fontSize: 15, fontWeight: "800" }}>
                  {item.summary}
                </Text>
              </View>
              {item.detail && item.detail.length > 0 && (
                <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#f0f0f0" }}>
                  {item.detail.map((detail, idx) => (
                    <View key={idx} style={styles.historyDetailRow}>
                      <Text style={styles.historyDetailLabel}>{detail.label}</Text>
                      <Text style={styles.historyDetailValue}>{detail.value}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}