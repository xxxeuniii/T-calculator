function apiBase() {
  if (typeof window === "undefined") return "/trade-agent/api/v1";
  const local = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  return local ? "http://127.0.0.1:8000/api/v1" : "/trade-agent/api/v1";
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
