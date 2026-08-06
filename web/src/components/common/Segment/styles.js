import { StyleSheet } from "react-native";
import palette from "../../../styles/theme";

const styles = StyleSheet.create({
  segment: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 999,
    padding: 4,
    backgroundColor: "#ffffff",
  },
  segmentItem: {
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  segmentItemActive: {
    backgroundColor: palette.ink,
  },
  segmentText: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "800",
  },
  segmentTextActive: {
    color: "#f8fff5",
  },
  segmentCompact: {
    padding: 2,
  },
  segmentItemCompact: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  segmentTextCompact: {
    fontSize: 12,
    fontWeight: "700",
  },
});

export default styles;
