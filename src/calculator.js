const COMMISSION_RATE = 0.0003;
const MIN_COMMISSION = 5;
const STAMP_TAX_RATE = 0.0005;

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function calculateCommission(amount) {
  return Math.max(amount * COMMISSION_RATE, MIN_COMMISSION);
}

function calculateTrade(values) {
  const costPrice = toNumber(values.costPrice);
  const totalShares = toNumber(values.totalShares);
  const tradeShares = toNumber(values.tradeShares);
  const sellPrice = toNumber(values.sellPrice);
  const buyPrice = toNumber(values.buyPrice);

  if (!tradeShares || !sellPrice || !buyPrice) {
    return null;
  }

  const spreadProfit = (sellPrice - buyPrice) * tradeShares;
  const sellAmount = sellPrice * tradeShares;
  const buyAmount = buyPrice * tradeShares;
  const sellCommission = calculateCommission(sellAmount);
  const buyCommission = calculateCommission(buyAmount);
  const totalCommission = sellCommission + buyCommission;
  const stampTax = sellAmount * STAMP_TAX_RATE;
  const netProfit = spreadProfit - totalCommission - stampTax;
  const originalCostAmount = costPrice * totalShares;
  const newCostPrice = totalShares ? (originalCostAmount - netProfit) / totalShares : 0;
  const costReduction = costPrice && totalShares ? costPrice - newCostPrice : 0;

  return {
    spreadProfit,
    sellCommission,
    buyCommission,
    totalCommission,
    stampTax,
    netProfit,
    newCostPrice,
    costReduction,
    isGain: netProfit >= 0,
  };
}

function calculateTrailingContract(values) {
  const activationPrice = toNumber(values.activationPrice);
  const callbackRate = toNumber(values.callbackRate);
  const quantity = toNumber(values.quantity);
  const side = values.side === "short" ? "short" : "long";

  if (!activationPrice || !callbackRate) {
    return null;
  }

  const callbackDecimal = callbackRate / 100;
  const expectedPrice =
    side === "short"
      ? activationPrice * (1 + callbackDecimal)
      : activationPrice * (1 - callbackDecimal);
  const callbackAmount = Math.abs(activationPrice - expectedPrice);

  return {
    side,
    activationPrice,
    callbackRate,
    callbackAmount,
    expectedPrice,
    quantity,
    notionalValue: quantity,
  };
}

module.exports = {
  COMMISSION_RATE,
  MIN_COMMISSION,
  STAMP_TAX_RATE,
  calculateCommission,
  calculateTrailingContract,
  calculateTrade,
};
