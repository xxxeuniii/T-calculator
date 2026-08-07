import { StyleSheet } from "react-native";
import palette from "../../../styles/theme";

const styles = StyleSheet.create({
  field: {
    gap: 7,
  },
  fieldLabel: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
    paddingVertical: 0,
    minHeight: 44,
    color: palette.ink,
    fontSize: 17,
  },
  stepButton: {
    width: 46,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#eeeeee",
    backgroundColor: "#fafafa",
  },
  stepButtonText: {
    color: palette.ink,
    fontSize: 20,
    lineHeight: 20,
    fontWeight: "900",
  },
});

export default styles;
