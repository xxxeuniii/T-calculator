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
  klineSectionLabel: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  klinePeriodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  klinePeriodChip: {
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: "#ffffff",
  },
  klinePeriodChipActive: {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
  },
  klinePeriodChipText: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  klinePeriodChipTextActive: {
    color: "#f8fff5",
  },
  fieldGrid: {
    gap: 10,
    marginTop: 14,
  },
  field: {
    gap: 7,
  },
  klineDateField: {
    position: "relative",
    zIndex: 5,
    overflow: "visible",
  },
  fieldLabel: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  klineHint: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  klineDateFallback: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafafa",
  },
  klineDateFallbackText: {
    color: palette.muted,
    fontSize: 13,
  },
  stepInputRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 7,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  stepInput: {
    flex: 1,
    paddingHorizontal: 14,
    color: palette.ink,
    fontSize: 17,
  },
  stepButton: {
    width: 46,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#eeeeee",
    backgroundColor: "#fafafa",
  },
  stepButtonText: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: "900",
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
  primaryLabel: {
    color: "rgba(248, 255, 245, 0.78)",
    fontWeight: "700",
    marginBottom: 8,
  },
  klineResultValue: {
    color: "#f8fff5",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
  },
});

export default styles;
