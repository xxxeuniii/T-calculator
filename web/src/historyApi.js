function apiBase() {
  if (typeof window === "undefined") return "/trade-tool/api";
  const local = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  return local ? "http://127.0.0.1:8000/api" : "/trade-tool/api";
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
  return parseResponse(await fetch(`${apiBase()}/trade-history`, { method: "DELETE" }));
}
