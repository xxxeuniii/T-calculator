import React from "react";
import { Text, View, Pressable } from "react-native";
import styles from "../../styles";

export default function Segment({ value, onChange, items }) {
  return (
    <View style={styles.segment}>
      {items.map((item) => (
        <Pressable
          key={item.value}
          onPress={() => onChange(item.value)}
          style={[styles.segmentItem, value === item.value && styles.segmentItemActive]}
        >
          <Text style={[styles.segmentText, value === item.value && styles.segmentTextActive]}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}