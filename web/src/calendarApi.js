const PROD_API_BASE = "http://106.53.77.119/trade-tool/api";

function apiBase() {
  if (typeof window !== "undefined" && window.location?.hostname === "106.53.77.119") {
    return "/trade-tool/api";
  }
  return PROD_API_BASE;
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.detail || `HTTP ${response.status}`);
  }
  return payload.data;
}

const cache = new Map();

export function fetchCalendarYear(year) {
  if (!cache.has(year)) {
    cache.set(
      year,
      parseResponse(fetch(`${apiBase()}/calendars/${year}`)).catch((error) => {
        cache.delete(year);
        throw error;
      })
    );
  }
  return cache.get(year);
}
