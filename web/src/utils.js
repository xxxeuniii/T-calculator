const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdtFormatter = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const priceFormatter = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

export function formatCurrency(value) {
  return value === null || value === undefined ? "--" : currencyFormatter.format(value);
}

export function formatPrice(value, unit = "元/股") {
  return value === null || value === undefined ? "--" : `${priceFormatter.format(value)} ${unit}`;
}

export function formatUsdt(value) {
  return value === null || value === undefined ? "--" : `${usdtFormatter.format(value)} USDT`;
}

export function formatNumber(value, digits = 2) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "--";
}

export function formatDate(value) {
  return value ? String(value).slice(0, 10) : "--";
}

export function formatHundredMillion(value) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value / 100000000).toFixed(2)} 亿元` : "--";
}