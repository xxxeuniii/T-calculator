import React from "react";
import { Text, TextInput, View } from "react-native";
import styles from "../../styles";

export default function Field({ label, value, onChangeText, placeholder, keyboardType = "decimal-pad", autoCapitalize }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
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