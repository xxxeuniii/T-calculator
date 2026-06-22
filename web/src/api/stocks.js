import { Platform } from "react-native";

function getApiBaseUrl() {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const { hostname, port } = window.location;
    const isLocalFrontend = hostname === "localhost" || hostname === "127.0.0.1";
    if (isLocalFrontend && port !== "8001") {
      return "http://127.0.0.1:8001";
    }
    return "";
  }
  return "http://127.0.0.1:8001";
}

async function getJson(path, fallbackMessage) {
  const response = await fetch(`${getApiBaseUrl()}${path}`);
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload.detail || fallbackMessage);
  }
  return payload.data;
}

export function fetchStockPrice(code) {
  return getJson(`/api/v1/stocks/${encodeURIComponent(code)}/price`, "当前股价请求失败");
}

export function fetchBalanceSheetAssets(code) {
  return getJson(`/api/v1/stocks/${encodeURIComponent(code)}/balance-sheet/assets`, "资产负债表请求失败");
}
