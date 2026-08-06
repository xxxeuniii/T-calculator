import React from "react";
import { Text, TextInput, View } from "react-native";
import styles from "./styles";

export default function Field({
  label,
  labelAccessory,
  value,
  onChangeText,
  placeholder,
  keyboardType = "decimal-pad",
  autoCapitalize,
}) {
  return (
    <View style={styles.field}>
      {label || labelAccessory ? (
        <View style={styles.fieldLabelRow}>
          {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
          {labelAccessory}
        </View>
      ) : null}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || ""}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor="#cccccc"
      />
    </View>
  );
}
