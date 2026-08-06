import { StyleSheet } from "react-native";
import palette from "./styles/theme";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.paper,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 0,
    paddingBottom: 32,
    gap: 0,
    alignItems: "stretch",
  },
  appHeader: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    zIndex: 10000,
    backgroundColor: "#ffffff",
    position: "relative",
  },
  menuButton: {
    width: 36,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  menuIcon: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
  },
  screenTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: "900",
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  menuPanel: {
    position: "absolute",
    top: 60,
    left: 16,
    width: 148,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 12,
    padding: 6,
    backgroundColor: "#ffffff",
    shadowColor: "#151515",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 1000,
    zIndex: 99999,
  },
  menuItem: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  menuItemActive: {
    backgroundColor: "#f2f2f2",
  },
  menuItemText: {
    color: palette.muted,
    fontSize: 15,
    fontWeight: "800",
  },
  menuItemTextActive: {
    color: palette.ink,
  },
});

export default styles;
