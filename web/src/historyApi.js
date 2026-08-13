function apiBase() {
  if (typeof window === "undefined") return "http://106.53.77.119/trade-agent/api/v1";
  return window.location.hostname === "106.53.77.119"
    ? "/trade-agent/api/v1"
    : "http://106.53.77.119/trade-agent/api/v1";
}

async function parseResponse(response) {
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(body.detail || body.error || "历史记录同步失败");
  return body.data;
}

export async function fetchTradeHistory() {
  return parseResponse(await fetch(`${apiBase()}/trade-history`));
}

export async function saveTradeHistory(record) {
  return parseResponse(await fetch(`${apiBase()}/trade-history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ record }),
  }));
}

export async function clearTradeHistory() {
  return parseResponse(await fetch(`${apiBase()}/trade-history/clear`, { method: "POST" }));
}
