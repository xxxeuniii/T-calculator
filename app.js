const COMMISSION_RATE = 0.0003;
const MIN_COMMISSION = 5;
const STAMP_TAX_RATE = 0.0005;

const fields = {
  costPrice: document.querySelector("#costPrice"),
  totalShares: document.querySelector("#totalShares"),
  marketPrice: document.querySelector("#marketPrice"),
  tradeShares: document.querySelector("#tradeShares"),
  sellPrice: document.querySelector("#sellPrice"),
  buyBackPrice: document.querySelector("#buyBackPrice"),
};

const output = {
  netProfitLabel: document.querySelector("#netProfitLabel"),
  netProfit: document.querySelector("#netProfit"),
  spreadProfit: document.querySelector("#spreadProfit"),
  totalCommission: document.querySelector("#totalCommission"),
  sellCommission: document.querySelector("#sellCommission"),
  buyCommission: document.querySelector("#buyCommission"),
  stampTax: document.querySelector("#stampTax"),
  newCostPrice: document.querySelector("#newCostPrice"),
  costReduction: document.querySelector("#costReduction"),
  formulaBox: document.querySelector("#formulaBox"),
  primaryResult: document.querySelector(".primary-result"),
};

const labels = {
  sellPrice: document.querySelector("#sellPriceLabel"),
  buyPrice: document.querySelector("#buyPriceLabel"),
};

const modeTabs = document.querySelectorAll(".mode-tab");
const calculatorForm = document.querySelector("#calculatorForm");
let currentMode = "positive";

const formatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const priceFormatter = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

function readNumber(input) {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : 0;
}

function getModeText() {
  if (currentMode === "reverse") {
    return {
      netLabel: "本次反T净收益",
      sellLabel: "反T卖出价",
      buyLabel: "反T买入价",
      sellPlaceholder: "例如 11.30",
      buyPlaceholder: "例如 10.90",
      emptyFormula: "反T净收益 = (卖出价 - 买入价) × 做T股数 - 买卖佣金 - 印花税",
      actionText: "反T先买后卖",
    };
  }

  return {
    netLabel: "本次正T净收益",
    sellLabel: "做T卖出价",
    buyLabel: "接回价",
    sellPlaceholder: "例如 11.30",
    buyPlaceholder: "例如 10.90",
    emptyFormula: "正T净收益 = (做T卖出价 - 接回价) × 做T股数 - 买卖佣金 - 印花税",
    actionText: "正T先卖后买",
  };
}

function renderModeText() {
  const text = getModeText();
  output.netProfitLabel.textContent = text.netLabel;
  labels.sellPrice.textContent = text.sellLabel;
  labels.buyPrice.textContent = text.buyLabel;
  fields.sellPrice.placeholder = text.sellPlaceholder;
  fields.buyBackPrice.placeholder = text.buyPlaceholder;
}

function setEmptyState() {
  const text = getModeText();
  output.netProfit.textContent = "--";
  output.spreadProfit.textContent = "--";
  output.totalCommission.textContent = "--";
  output.sellCommission.textContent = "--";
  output.buyCommission.textContent = "--";
  output.stampTax.textContent = "--";
  output.newCostPrice.textContent = "--";
  output.costReduction.textContent = "--";
  output.formulaBox.textContent = text.emptyFormula;
  output.primaryResult.classList.remove("loss");
}

function calculateCommission(amount) {
  return Math.max(amount * COMMISSION_RATE, MIN_COMMISSION);
}

function calculate() {
  const costPrice = readNumber(fields.costPrice);
  const totalShares = readNumber(fields.totalShares);
  const marketPrice = readNumber(fields.marketPrice);
  const tradeShares = readNumber(fields.tradeShares);
  const sellPrice = readNumber(fields.sellPrice);
  const buyBackPrice = readNumber(fields.buyBackPrice);

  if (!tradeShares || !sellPrice || !buyBackPrice) {
    setEmptyState();
    return;
  }

  const spreadProfit = (sellPrice - buyBackPrice) * tradeShares;
  const sellAmount = sellPrice * tradeShares;
  const buyAmount = buyBackPrice * tradeShares;
  const sellCommission = calculateCommission(sellAmount);
  const buyCommission = calculateCommission(buyAmount);
  const totalCommission = sellCommission + buyCommission;
  const stampTax = sellPrice * tradeShares * STAMP_TAX_RATE;
  const totalCost = totalCommission + stampTax;
  const netProfit = spreadProfit - totalCost;
  const originalCostAmount = costPrice * totalShares;
  const newCostPrice = totalShares ? (originalCostAmount - netProfit) / totalShares : 0;
  const costReduction = costPrice && totalShares ? costPrice - newCostPrice : 0;
  const currentProfit = marketPrice && totalShares ? (marketPrice - costPrice) * totalShares : null;
  const isGain = netProfit >= 0;

  output.netProfit.textContent = formatter.format(netProfit);
  output.spreadProfit.textContent = formatter.format(spreadProfit);
  output.totalCommission.textContent = formatter.format(totalCommission);
  output.sellCommission.textContent = formatter.format(sellCommission);
  output.buyCommission.textContent = formatter.format(buyCommission);
  output.stampTax.textContent = formatter.format(stampTax);
  output.newCostPrice.textContent = totalShares ? `${priceFormatter.format(newCostPrice)} 元/股` : "--";
  output.costReduction.textContent = totalShares ? `${priceFormatter.format(costReduction)} 元/股` : "--";
  output.primaryResult.classList.toggle("loss", !isGain);

  const currentText = currentProfit === null ? "" : ` 当前参考浮动盈亏约 ${formatter.format(currentProfit)}。`;
  const modeText = getModeText();
  output.formulaBox.textContent =
    `(${priceFormatter.format(sellPrice)} - ${priceFormatter.format(buyBackPrice)}) × ${tradeShares} - ${formatter.format(totalCommission)}佣金 - ${formatter.format(stampTax)}印花税 = ${formatter.format(netProfit)}。` +
    ` ${modeText.actionText}，卖出金额收印花税。` +
    ` 若接回同等股数，持仓股数不变，净收益会把整体成本约降低 ${priceFormatter.format(costReduction)} 元/股。` +
    currentText;
}

modeTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    currentMode = tab.dataset.mode;
    calculatorForm.dataset.mode = currentMode;
    modeTabs.forEach((item) => {
      const isActive = item === tab;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-selected", String(isActive));
    });
    renderModeText();
    calculate();
  });
});

Object.values(fields).forEach((field) => {
  field.addEventListener("input", calculate);
});

calculatorForm.addEventListener("reset", () => {
  window.setTimeout(setEmptyState, 0);
});

renderModeText();
setEmptyState();
