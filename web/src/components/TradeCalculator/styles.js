import { StyleSheet } from "react-native";
import palette from "../../styles/theme";

const styles = StyleSheet.create({
  panel: {
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
    padding: 12,
    elevation: 0,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  clearButton: {
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  clearText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  fieldGrid: {
    gap: 10,
    marginTop: 14,
  },
  feeRow: {
    flexDirection: "column",
    gap: 8,
    marginTop: 14,
  },
  feeChip: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#e2e2e2",
    borderRadius: 7,
    paddingVertical: 7,
    paddingHorizontal: 10,
    color: palette.ink,
    backgroundColor: "#f7f7f7",
    fontSize: 13,
    fontWeight: "700",
    width: "100%",
  },
  resultPanel: {
    borderWidth: 0,
    borderRadius: 7,
    backgroundColor: "transparent",
    padding: 12,
    elevation: 0,
  },
  primaryResult: {
    borderRadius: 8,
    padding: 18,
    backgroundColor: palette.ink,
  },
  primaryGain: {
    backgroundColor: palette.profitRed,
  },
  primaryLoss: {
    backgroundColor: palette.lossGreen,
  },
  primaryLabel: {
    color: "rgba(248, 255, 245, 0.78)",
    fontWeight: "700",
    marginBottom: 8,
  },
  primaryValue: {
    color: "#f8fff5",
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  formula: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 7,
    padding: 12,
    color: palette.muted,
    backgroundColor: "#ffffff",
    lineHeight: 22,
  },
  confirmButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
    marginTop: 12,
    backgroundColor: palette.ink,
  },
  disabledButton: {
    opacity: 0.35,
  },
  confirmText: {
    color: "#f8fff5",
    fontSize: 16,
    fontWeight: "900",
  },
});

export default styles;
