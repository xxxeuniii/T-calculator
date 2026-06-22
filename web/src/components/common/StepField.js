import React from "react";
import { Text, TextInput, View, Pressable } from "react-native";
import styles from "../../styles";

export default function StepField({ label, value, onChangeText, onStepDown, onStepUp }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.stepInputRow}>
        <Pressable onPress={onStepDown} style={styles.stepButton}>
          <Text style={styles.stepButtonText}>−</Text>
        </Pressable>
        <TextInput
          style={styles.stepInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          textAlign="center"
        />
        <Pressable onPress={onStepUp} style={styles.stepButton}>
          <Text style={styles.stepButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}