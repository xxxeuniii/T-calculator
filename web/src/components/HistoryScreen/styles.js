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
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
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
  emptyText: {
    color: palette.muted,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 40,
  },
  historyItem: {
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e6e6e6",
    marginBottom: 10,
  },
  historyProfitItem: {
    borderColor: palette.profitRed,
  },
  historyItemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  historyType: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  historyTime: {
    color: palette.muted,
    fontSize: 12,
  },
  historyDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  historyDetailLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  historyDetailValue: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "600",
  },
});

export default styles;
