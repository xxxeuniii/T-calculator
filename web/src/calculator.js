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

function calculateRoiFromPrice(entryPrice, leverage, price, side, kind) {
  const entry = toNumber(entryPrice);
  const lev = toNumber(leverage);
  const target = toNumber(price);
  if (!entry || !lev || lev <= 0 || !target) return null;

  const moveRatio =
    kind === "stop"
      ? side === "short"
        ? (target - entry) / entry
        : (entry - target) / entry
      : side === "short"
        ? (entry - target) / entry
        : (target - entry) / entry;

  return moveRatio * lev * 100;
}

function calculatePricesFromRoi(entryPrice, leverage, targetRoi, side) {
  const entry = toNumber(entryPrice);
  const lev = toNumber(leverage);
  const roi = toNumber(targetRoi);
  if (!entry || !lev || lev <= 0 || !roi) return null;

  const priceMoveAmount = entry * (roi / lev / 100);
  return {
    takeProfitPrice: side === "short" ? entry - priceMoveAmount : entry + priceMoveAmount,
    priceMoveAmount,
    priceMovePercent: roi / lev,
  };
}

function parseRiskRewardRatio(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;

  const match = text.match(/^(\d+(?:\.\d+)?)\s*[:：/]\s*(\d+(?:\.\d+)?)$/);
  if (match) {
    const left = Number(match[1]);
    const right = Number(match[2]);
    if (!left || !right) return null;
    return right / left;
  }

  const single = Number(text);
  return Number.isFinite(single) && single > 0 ? single : null;
}

function formatRiskRewardRatio(multiple) {
  if (typeof multiple !== "number" || !Number.isFinite(multiple) || multiple <= 0) return "";
  return `1:${Number(multiple.toFixed(2))}`;
}

function calculateStopLossFromRiskReward(entryPrice, takeProfitPrice, side, riskReward) {
  const entry = toNumber(entryPrice);
  const takeProfit = toNumber(takeProfitPrice);
  const multiple = typeof riskReward === "number" ? riskReward : parseRiskRewardRatio(riskReward);
  if (!entry || !takeProfit || !multiple) return null;

  const rewardDistance = Math.abs(takeProfit - entry);
  const riskDistance = rewardDistance / multiple;
  return side === "short" ? entry + riskDistance : entry - riskDistance;
}

function calculateRiskRewardFromPrices(entryPrice, takeProfitPrice, stopLossPrice) {
  const entry = toNumber(entryPrice);
  const takeProfit = toNumber(takeProfitPrice);
  const stopLoss = toNumber(stopLossPrice);
  if (!entry || !takeProfit || !stopLoss) return null;

  const rewardDistance = Math.abs(takeProfit - entry);
  const riskDistance = Math.abs(stopLoss - entry);
  if (!riskDistance) return null;
  return rewardDistance / riskDistance;
}

function calculateRoiContract(values) {
  const entryPrice = toNumber(values.entryPrice);
  const leverage = toNumber(values.leverage);
  const quantity = toNumber(values.quantity);
  const currentPrice = toNumber(values.currentPrice);
  const side = values.side === "short" ? "short" : "long";
  const symbol = typeof values.symbol === "string" ? values.symbol.trim() : "";

  let takeProfitPrice = toNumber(values.takeProfitPrice);
  let stopLossPrice = toNumber(values.stopLossPrice);
  let targetRoi = toNumber(values.targetRoi);
  let riskRewardMultiple = parseRiskRewardRatio(values.riskReward);

  if (!entryPrice || !leverage || leverage <= 0) {
    return null;
  }

  if (!takeProfitPrice && targetRoi) {
    const derived = calculatePricesFromRoi(entryPrice, leverage, targetRoi, side);
    if (derived) {
      takeProfitPrice = derived.takeProfitPrice;
    }
  }

  if (!takeProfitPrice) {
    return null;
  }

  if (!stopLossPrice && riskRewardMultiple) {
    const derivedStop = calculateStopLossFromRiskReward(
      entryPrice,
      takeProfitPrice,
      side,
      riskRewardMultiple
    );
    if (derivedStop !== null) {
      stopLossPrice = derivedStop;
    }
  }

  const takeProfitRoi = calculateRoiFromPrice(entryPrice, leverage, takeProfitPrice, side, "take");
  if (takeProfitRoi === null) {
    return null;
  }

  const stopLossRoi = stopLossPrice
    ? calculateRoiFromPrice(entryPrice, leverage, stopLossPrice, side, "stop")
    : null;

  if (!targetRoi) {
    targetRoi = takeProfitRoi;
  }

  if (stopLossPrice && !riskRewardMultiple) {
    riskRewardMultiple = calculateRiskRewardFromPrices(entryPrice, takeProfitPrice, stopLossPrice);
  } else if (stopLossPrice && riskRewardMultiple) {
    const measured = calculateRiskRewardFromPrices(entryPrice, takeProfitPrice, stopLossPrice);
    if (measured !== null) {
      riskRewardMultiple = measured;
    }
  }

  const takeProfitMoveAmount = Math.abs(takeProfitPrice - entryPrice);
  const stopLossMoveAmount = stopLossPrice ? Math.abs(stopLossPrice - entryPrice) : 0;
  const takeProfitMovePercent = (takeProfitMoveAmount / entryPrice) * 100;
  const stopLossMovePercent = stopLossPrice ? (stopLossMoveAmount / entryPrice) * 100 : 0;
  const notionalValue = quantity ? quantity * leverage : 0;
  const estimatedProfit = notionalValue ? notionalValue * (takeProfitRoi / 100 / leverage) : 0;
  const estimatedLoss =
    notionalValue && stopLossRoi !== null ? -notionalValue * (stopLossRoi / 100 / leverage) : 0;

  let gapToTakeProfit = null;
  let gapToStopLoss = null;
  let currentRoi = null;
  let unrealizedPnl = null;
  let currentMovePercent = null;

  if (currentPrice > 0) {
    const moveRatio =
      side === "short"
        ? (entryPrice - currentPrice) / entryPrice
        : (currentPrice - entryPrice) / entryPrice;
    currentRoi = moveRatio * leverage * 100;
    currentMovePercent = moveRatio * 100;
    unrealizedPnl = notionalValue ? notionalValue * moveRatio : null;

    const tpDiff = takeProfitPrice - currentPrice;
    gapToTakeProfit = {
      amount: Math.abs(tpDiff),
      percent: (Math.abs(tpDiff) / currentPrice) * 100,
      direction: tpDiff > 0 ? "up" : tpDiff < 0 ? "down" : "flat",
      signedAmount: tpDiff,
    };

    if (stopLossPrice) {
      const slDiff = stopLossPrice - currentPrice;
      gapToStopLoss = {
        amount: Math.abs(slDiff),
        percent: (Math.abs(slDiff) / currentPrice) * 100,
        direction: slDiff > 0 ? "up" : slDiff < 0 ? "down" : "flat",
        signedAmount: slDiff,
      };
    }
  }

  return {
    side,
    symbol,
    entryPrice,
    currentPrice: currentPrice || 0,
    leverage,
    targetRoi,
    takeProfitRoi,
    stopLossRoi,
    riskRewardMultiple: riskRewardMultiple || 0,
    riskRewardLabel: riskRewardMultiple ? formatRiskRewardRatio(riskRewardMultiple) : "",
    quantity,
    notionalValue,
    priceMovePercent: takeProfitMovePercent,
    priceMoveAmount: takeProfitMoveAmount,
    takeProfitMoveAmount,
    stopLossMoveAmount,
    takeProfitMovePercent,
    stopLossMovePercent,
    takeProfitPrice,
    stopLossPrice: stopLossPrice || 0,
    hasStopLoss: Boolean(stopLossPrice),
    hasCurrentPrice: currentPrice > 0,
    currentRoi,
    currentMovePercent,
    unrealizedPnl,
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
  calculateRoiFromPrice,
  calculatePricesFromRoi,
  parseRiskRewardRatio,
  formatRiskRewardRatio,
  calculateStopLossFromRiskReward,
  calculateRiskRewardFromPrices,
  calculateRoiContract,
  calculateTrade,
};
