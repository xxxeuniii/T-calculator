import React from "react";
import { Text, TextInput, View, Pressable } from "react-native";
import styles from "../../styles";

export default function StepField({ label, labelAccessory, value, onChangeText, onStepDown, onStepUp }) {
  return (
    <View style={styles.field}>
      {label || labelAccessory ? (
        <View style={styles.fieldLabelRow}>
          {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
          {labelAccessory}
        </View>
      ) : null}
      <View style={styles.stepInputRow}>
        <TextInput
          style={styles.stepInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
        />
        <Pressable onPress={onStepDown} style={styles.stepButton}>
          <Text style={styles.stepButtonText}>−</Text>
        </Pressable>
        <Pressable onPress={onStepUp} style={styles.stepButton}>
          <Text style={styles.stepButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}
