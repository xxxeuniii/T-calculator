function apiBase() {
  if (typeof window === "undefined") return "http://106.53.77.119/trade-tool/api";
  return window.location.hostname === "106.53.77.119"
    ? "/trade-tool/api"
    : "http://106.53.77.119/trade-tool/api";
}

async function parseResponse(response) {
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(body.detail || body.error || "出勤数据同步失败");
  return body.data;
}

export async function fetchAttendanceMonth(month) {
  return parseResponse(await fetch(`${apiBase()}/attendance/${month}`));
}

export async function saveAttendanceDate(date, status) {
  return parseResponse(await fetch(`${apiBase()}/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, status: status || null }),
  }));
}
