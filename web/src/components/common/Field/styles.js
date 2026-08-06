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
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 7,
    paddingHorizontal: 14,
    color: palette.ink,
    backgroundColor: "#ffffff",
    fontSize: 17,
  },
});

export default styles;
