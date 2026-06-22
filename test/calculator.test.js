const assert = require("node:assert/strict");

const { calculateCommission, calculateTrade, calculateTrailingContract } = require("../src/calculator");

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
  activationPrice: "64000",
  callbackRate: "0.1",
  quantity: "1412.4",
});

assert.ok(longTrailing);
assert.equal(Number(longTrailing.expectedPrice.toFixed(2)), 63936);
assert.equal(Number(longTrailing.callbackAmount.toFixed(2)), 64);

const shortTrailing = calculateTrailingContract({
  side: "short",
  activationPrice: "64000",
  callbackRate: "0.1",
});

assert.ok(shortTrailing);
assert.equal(Number(shortTrailing.expectedPrice.toFixed(2)), 64064);

console.log("calculator tests passed");
