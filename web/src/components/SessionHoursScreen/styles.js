import { StyleSheet } from "react-native";
import palette from "../../styles/theme";

const styles = StyleSheet.create({
  sessionContainer: {
    paddingBottom: 16,
  },
  sessionNowBar: {
    borderBottomWidth: 1,
    borderBottomColor: "#ececec",
    paddingVertical: 18,
    paddingHorizontal: 2,
    marginBottom: 18,
    alignItems: "center",
  },
  sessionNowValue: {
    color: palette.ink,
    fontSize: 28,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.4,
    textAlign: "center",
  },
  sessionGrid: {
    gap: 16,
  },
  sessionGridDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  sessionCard: {
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#ffffff",
  },
  sessionCardDesktop: {
    width: "48%",
    minWidth: 280,
  },
  sessionCardActive: {
    borderColor: palette.ink,
  },
  sessionCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
    gap: 8,
  },
  sessionCardTopRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  sessionName: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: "900",
  },
  sessionIndexNote: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  sessionIndexLink: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
    textDecorationLine: "none",
  },
  phaseList: {
    marginTop: 8,
  },
  phaseRow: {
    position: "relative",
    overflow: "hidden",
  },
  phaseRowDivided: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  phaseRowActive: {
    backgroundColor: "#f7f7f7",
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  phaseProgressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(21, 21, 21, 0.07)",
  },
  phaseRowInner: {
    position: "relative",
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 11,
  },
  phaseLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "left",
  },
  phaseLabelActive: {
    color: palette.ink,
  },
  phaseMain: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-start",
  },
  phaseTime: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    textAlign: "right",
    flexShrink: 0,
  },
  phaseTimeActive: {
    color: palette.ink,
  },
  phaseHint: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
    textAlign: "left",
  },
  sessionCardFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  sessionCountdownEntry: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: "#ffffff",
  },
  sessionCountdownEntryText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: "800",
  },
  countdownOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  countdownBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  countdownSheet: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    maxHeight: "80%",
    zIndex: 1,
  },
  countdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4,
  },
  countdownTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: "900",
    flex: 1,
  },
  countdownCloseBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  countdownCloseText: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  countdownList: {
    paddingBottom: 6,
  },
  countdownRow: {
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  countdownRowDivided: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  countdownRowCurrent: {
    backgroundColor: "#f7f7f7",
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  countdownRowLeft: {
    flex: 1,
    minWidth: 0,
  },
  countdownPhaseLabel: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  countdownPhaseRange: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  countdownRowRight: {
    alignItems: "flex-end",
  },
  countdownCaption: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  countdownValue: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  countdownValueCurrent: {
    color: palette.profitRed,
  },
  sessionDstText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  sessionFooter: {
    marginTop: 14,
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});

export default styles;
