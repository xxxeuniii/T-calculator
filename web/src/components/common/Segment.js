import React from "react";
import { Text, View, Pressable } from "react-native";
import styles from "../../styles";

export default function Segment({ value, onChange, items, compact = false }) {
  return (
    <View style={[styles.segment, compact && styles.segmentCompact]}>
      {items.map((item) => (
        <Pressable
          key={item.value}
          onPress={() => onChange(item.value)}
          style={[
            styles.segmentItem,
            compact && styles.segmentItemCompact,
            value === item.value && styles.segmentItemActive,
          ]}
        >
          <Text
            style={[
              styles.segmentText,
              compact && styles.segmentTextCompact,
              value === item.value && styles.segmentTextActive,
            ]}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}