const assert = require("node:assert/strict");

const {
  calculateCommission,
  calculateTrade,
  calculateTrailingContract,
  calculateRoiContract,
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
assert.equal(Number(longRoi.stopLossPrice.toFixed(2)), 66046.86);
assert.equal(Number(longRoi.estimatedProfit.toFixed(2)), 4.67);

const shortRoi = calculateRoiContract({
  side: "short",
  entryPrice: "66714.9",
  leverage: "100",
  targetRoi: "150",
  quantity: "466.7",
});

assert.ok(shortRoi);
assert.equal(Number(shortRoi.takeProfitPrice.toFixed(2)), 65714.18);
assert.equal(Number(shortRoi.stopLossPrice.toFixed(2)), 67715.62);
assert.equal(Number(shortRoi.estimatedProfit.toFixed(2)), 7);

const longRoiWithCurrent = calculateRoiContract({
  side: "long",
  entryPrice: "66714",
  currentPrice: "66694.2",
  leverage: "100",
  targetRoi: "100",
});

assert.ok(longRoiWithCurrent.gapToTakeProfit);
assert.equal(longRoiWithCurrent.gapToTakeProfit.direction, "up");
assert.equal(Number(longRoiWithCurrent.gapToTakeProfit.amount.toFixed(2)), 686.94);
assert.equal(longRoiWithCurrent.gapToStopLoss.direction, "down");
assert.equal(Number(longRoiWithCurrent.gapToStopLoss.amount.toFixed(2)), 647.34);

console.log("calculator tests passed");
