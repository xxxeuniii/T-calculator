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
  const entryPrice = toNumber(values.entryPrice);
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
  const profitRate = entryPrice
    ? side === "short"
      ? (entryPrice - expectedPrice) / entryPrice
      : (expectedPrice - entryPrice) / entryPrice
    : 0;
  const estimatedProfit = quantity && entryPrice ? quantity * profitRate : 0;

  return {
    side,
    entryPrice,
    activationPrice,
    callbackRate,
    callbackAmount,
    expectedPrice,
    quantity,
    notionalValue: quantity,
    profitRate,
    estimatedProfit,
  };
}

function calculateRoiContract(values) {
  const entryPrice = toNumber(values.entryPrice);
  const leverage = toNumber(values.leverage);
  const targetRoi = toNumber(values.targetRoi);
  const quantity = toNumber(values.quantity);
  const currentPrice = toNumber(values.currentPrice);
  const side = values.side === "short" ? "short" : "long";
  const symbol = typeof values.symbol === "string" ? values.symbol.trim() : "";

  if (!entryPrice || !leverage || leverage <= 0 || !targetRoi) {
    return null;
  }

  const priceMovePercent = targetRoi / leverage;
  const priceMoveDecimal = priceMovePercent / 100;
  const priceMoveAmount = entryPrice * priceMoveDecimal;
  const takeProfitPrice =
    side === "short" ? entryPrice - priceMoveAmount : entryPrice + priceMoveAmount;
  const stopLossPrice =
    side === "short" ? entryPrice + priceMoveAmount : entryPrice - priceMoveAmount;
  const estimatedProfit = quantity ? quantity * priceMoveDecimal : 0;
  const estimatedLoss = quantity ? -quantity * priceMoveDecimal : 0;

  let gapToTakeProfit = null;
  let gapToStopLoss = null;
  if (currentPrice > 0) {
    const tpDiff = takeProfitPrice - currentPrice;
    const slDiff = stopLossPrice - currentPrice;
    gapToTakeProfit = {
      amount: Math.abs(tpDiff),
      percent: (Math.abs(tpDiff) / currentPrice) * 100,
      direction: tpDiff > 0 ? "up" : tpDiff < 0 ? "down" : "flat",
      signedAmount: tpDiff,
    };
    gapToStopLoss = {
      amount: Math.abs(slDiff),
      percent: (Math.abs(slDiff) / currentPrice) * 100,
      direction: slDiff > 0 ? "up" : slDiff < 0 ? "down" : "flat",
      signedAmount: slDiff,
    };
  }

  return {
    side,
    symbol,
    entryPrice,
    currentPrice: currentPrice || 0,
    leverage,
    targetRoi,
    quantity,
    priceMovePercent,
    priceMoveAmount,
    takeProfitPrice,
    stopLossPrice,
    estimatedProfit,
    estimatedLoss,
    gapToTakeProfit,
    gapToStopLoss,
  };
}

module.exports = {
  COMMISSION_RATE,
  MIN_COMMISSION,
  STAMP_TAX_RATE,
  calculateCommission,
  calculateTrailingContract,
  calculateRoiContract,
  calculateTrade,
};
