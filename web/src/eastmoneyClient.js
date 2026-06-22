function getApiBaseUrl() {
  return "http://127.0.0.1:8000";
}

export async function getStockPrice(code) {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/v1/stocks/${encodeURIComponent(code)}/price`);
    const data = await response.json();
    return data;
  } catch (e) {
    return { success: false, detail: e.message };
  }
}

export async function getBalanceSheetAssets(code) {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/v1/stocks/${encodeURIComponent(code)}/balance-sheet/assets`);
    const data = await response.json();
    return data;
  } catch (e) {
    return { success: false, detail: e.message };
  }
}

export async function getIncomeStatement(code) {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/v1/stocks/${encodeURIComponent(code)}/income-statement`);
    const data = await response.json();
    return data;
  } catch (e) {
    return { success: false, detail: e.message };
  }
}

export async function getValuationMethod(code) {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/v1/stocks/${encodeURIComponent(code)}/valuation-method`);
    const data = await response.json();
    return data;
  } catch (e) {
    return { success: false, detail: e.message };
  }
}

export async function getFinancialData(code) {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/v1/stocks/${encodeURIComponent(code)}/financial-data`);
    const data = await response.json();
    return data;
  } catch (e) {
    return { success: false, detail: e.message };
  }
}

export async function getCompoundGrowth(code) {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/v1/stocks/${encodeURIComponent(code)}/compound-growth`);
    const data = await response.json();
    return data;
  } catch (e) {
    return { success: false, detail: e.message };
  }
}

export async function getStockPrediction(code) {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/v1/stocks/${encodeURIComponent(code)}/prediction`);
    const data = await response.json();
    return data;
  } catch (e) {
    return { success: false, detail: e.message };
  }
}
