const assert = require("node:assert/strict");

const {
  calculateCommission,
  calculateTrade,
  calculateTrailingContract,
  calculateRoiContract,
  calculateRoiFromPrice,
  calculatePricesFromRoi,
  parseRiskRewardRatio,
  formatRiskRewardRatio,
  calculateStopLossFromRiskReward,
  calculateRiskRewardFromPrices,
} = require("../src/calculator");

assert.equal(calculateCommission(1000), 5);
assert.equal(Number(calculateCommission(20000).toFixed(2)), 6);

const result = calculateTrade({
  costPrice: "10.5",
  totalShares: "5000",
  tradeShares: "1000",
  sellPrice: "11.3",
  buyPrice: "10.9",
});

assert.ok(result);
assert.equal(result.sellCommission, 5);
assert.equal(result.buyCommission, 5);
assert.equal(result.stampTax, 5.65);
assert.equal(Number(result.netProfit.toFixed(2)), 384.35);
assert.equal(Number(result.newCostPrice.toFixed(3)), 10.423);

const longTrailing = calculateTrailingContract({
  side: "long",
  entryPrice: "63800",
  activationPrice: "64000",
  callbackRate: "0.1",
  quantity: "1412.4",
});

assert.ok(longTrailing);
assert.equal(Number(longTrailing.expectedPrice.toFixed(2)), 63936);
assert.equal(Number(longTrailing.callbackAmount.toFixed(2)), 64);
assert.equal(Number(longTrailing.estimatedProfit.toFixed(2)), 3.01);

const shortTrailing = calculateTrailingContract({
  side: "short",
  entryPrice: "64172.5",
  activationPrice: "64000",
  callbackRate: "0.1",
  quantity: "1408",
});

assert.ok(shortTrailing);
assert.equal(Number(shortTrailing.expectedPrice.toFixed(2)), 64064);
assert.equal(Number(shortTrailing.estimatedProfit.toFixed(2)), 2.38);

const longRoi = calculateRoiContract({
  side: "long",
  symbol: "BTCUSDT",
  entryPrice: "66714",
  leverage: "100",
  targetRoi: "100",
  quantity: "466.7",
});

assert.ok(longRoi);
assert.equal(Number(longRoi.priceMovePercent.toFixed(2)), 1);
assert.equal(Number(longRoi.priceMoveAmount.toFixed(2)), 667.14);
assert.equal(Number(longRoi.takeProfitPrice.toFixed(2)), 67381.14);
assert.equal(longRoi.hasStopLoss, false);
assert.equal(Number(longRoi.notionalValue.toFixed(2)), 46670);
assert.equal(Number(longRoi.estimatedProfit.toFixed(2)), 466.7);
assert.equal(Number(longRoi.takeProfitRoi.toFixed(2)), 100);

const longRoiWithRr = calculateRoiContract({
  side: "long",
  entryPrice: "66714",
  leverage: "100",
  targetRoi: "100",
  riskReward: "1:3",
});

assert.ok(longRoiWithRr.hasStopLoss);
assert.equal(Number(longRoiWithRr.takeProfitPrice.toFixed(2)), 67381.14);
assert.equal(Number(longRoiWithRr.stopLossPrice.toFixed(2)), 66491.62);
assert.equal(longRoiWithRr.riskRewardLabel, "1:3");

const shortRoi = calculateRoiContract({
  side: "short",
  entryPrice: "66714.9",
  leverage: "100",
  targetRoi: "150",
  quantity: "466.7",
});

assert.ok(shortRoi);
assert.equal(Number(shortRoi.takeProfitPrice.toFixed(2)), 65714.18);
assert.equal(shortRoi.hasStopLoss, false);
assert.equal(Number(shortRoi.notionalValue.toFixed(2)), 46670);
assert.equal(Number(shortRoi.estimatedProfit.toFixed(2)), 700.05);

const fromPrices = calculateRoiContract({
  side: "long",
  entryPrice: "66714",
  leverage: "100",
  takeProfitPrice: "67381.14",
  stopLossPrice: "66046.86",
  quantity: "466.7",
});

assert.ok(fromPrices);
assert.equal(Number(fromPrices.takeProfitRoi.toFixed(2)), 100);
assert.equal(Number(fromPrices.stopLossRoi.toFixed(2)), 100);
assert.equal(fromPrices.hasStopLoss, true);
assert.equal(fromPrices.riskRewardLabel, "1:1");

const derived = calculatePricesFromRoi("66714", "100", "100", "long");
assert.ok(derived);
assert.equal(Number(derived.takeProfitPrice.toFixed(2)), 67381.14);
assert.equal(derived.stopLossPrice, undefined);

const reverseRoi = calculateRoiFromPrice("66714", "100", "67381.14", "long", "take");
assert.equal(Number(reverseRoi.toFixed(2)), 100);

assert.equal(parseRiskRewardRatio("1:3"), 3);
assert.equal(formatRiskRewardRatio(3), "1:3");
assert.equal(Number(calculateStopLossFromRiskReward("66714", "67381.14", "long", "1:3").toFixed(2)), 66491.62);
assert.equal(Number(calculateRiskRewardFromPrices("66714", "67381.14", "66491.62").toFixed(2)), 3);

const longRoiWithCurrent = calculateRoiContract({
  side: "long",
  entryPrice: "66714",
  currentPrice: "66694.2",
  leverage: "100",
  targetRoi: "100",
  stopLossPrice: "66046.86",
});

assert.ok(longRoiWithCurrent.gapToTakeProfit);
assert.equal(longRoiWithCurrent.gapToTakeProfit.direction, "up");
assert.equal(longRoiWithCurrent.gapToTakeProfit.reached, false);
assert.equal(Number(longRoiWithCurrent.gapToTakeProfit.amount.toFixed(2)), 686.94);
assert.equal(longRoiWithCurrent.gapToStopLoss.direction, "down");
assert.equal(longRoiWithCurrent.gapToStopLoss.reached, false);
assert.equal(Number(longRoiWithCurrent.gapToStopLoss.amount.toFixed(2)), 647.34);
assert.equal(longRoiWithCurrent.hasCurrentPrice, true);
assert.equal(Number(longRoiWithCurrent.currentRoi.toFixed(2)), -2.97);

const shortPastTakeProfit = calculateRoiContract({
  side: "short",
  entryPrice: "66714.9",
  currentPrice: "65000",
  leverage: "100",
  targetRoi: "100",
  stopLossPrice: "66937.28",
});
assert.equal(shortPastTakeProfit.gapToTakeProfit.reached, true);
assert.equal(shortPastTakeProfit.gapToTakeProfit.direction, "flat");
assert.equal(shortPastTakeProfit.gapToStopLoss.reached, false);
assert.equal(shortPastTakeProfit.gapToStopLoss.direction, "up");

const longPastBoth = calculateRoiContract({
  side: "long",
  entryPrice: "66714",
  currentPrice: "68000",
  leverage: "100",
  targetRoi: "100",
  stopLossPrice: "66046.86",
});
assert.equal(longPastBoth.gapToTakeProfit.reached, true);
assert.equal(longPastBoth.gapToStopLoss.reached, false);

const longHitStopLoss = calculateRoiContract({
  side: "long",
  entryPrice: "66714",
  currentPrice: "65000",
  leverage: "100",
  targetRoi: "100",
  stopLossPrice: "66046.86",
});
assert.equal(longHitStopLoss.gapToTakeProfit.reached, false);
assert.equal(longHitStopLoss.gapToStopLoss.reached, true);

const unrealizedCase = calculateRoiContract({
  side: "long",
  entryPrice: "66714",
  currentPrice: "67381.14",
  leverage: "100",
  targetRoi: "100",
  quantity: "100",
});

assert.equal(Number(unrealizedCase.currentRoi.toFixed(2)), 100);
assert.equal(Number(unrealizedCase.unrealizedPnl.toFixed(2)), 100);

console.log("calculator tests passed");
