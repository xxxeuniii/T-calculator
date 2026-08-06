import { StyleSheet } from "react-native";
import palette from "../../../styles/theme";

const styles = StyleSheet.create({
  metric: {
    width: "48%",
    minWidth: 145,
    borderWidth: 1,
    borderColor: "#eeeeee",
    borderRadius: 7,
    padding: 12,
    backgroundColor: "#ffffff",
  },
  metricLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 7,
  },
  metricValue: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: "800",
  },
  contractGainMetric: {
    borderColor: "rgba(15, 123, 85, 0.38)",
    backgroundColor: "rgba(15, 123, 85, 0.08)",
  },
  contractLossMetric: {
    borderColor: "rgba(182, 48, 48, 0.34)",
    backgroundColor: "rgba(182, 48, 48, 0.08)",
  },
  contractGainText: {
    color: palette.lossGreen,
  },
  contractLossText: {
    color: palette.profitRed,
  },
});

export default styles;
