const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://trading-app-phase1-production.up.railway.app";

async function handleResponse(response) {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function fetchSignals() {
  const response = await fetch(`${API_BASE_URL}/signals`);
  return handleResponse(response);
}

export async function fetchSignalHistory(symbol, limit = 10) {
  const response = await fetch(
    `${API_BASE_URL}/signals/history/${symbol}?limit=${limit}`
  );
  return handleResponse(response);
}

export async function fetchStockAnalysis(symbol) {
  const response = await fetch(`${API_BASE_URL}/analyze/${symbol}`);
  return handleResponse(response);
}

export async function fetchSchedulerStatus() {
  const response = await fetch(`${API_BASE_URL}/scheduler/status`);
  return handleResponse(response);
}

export async function fetchNewsHistory(symbol, limit = 10) {
  const response = await fetch(
    `${API_BASE_URL}/news/history/${symbol}?limit=${limit}`
  );
  return handleResponse(response);
}

/* localStorage helpers for frontend-only pages */

const SETTINGS_KEY = "app_settings";
const TRADE_HISTORY_KEY = "trade_history";

export function getAppSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved
      ? JSON.parse(saved)
      : {
          apiUrl: API_BASE_URL,
          riskPerTrade: 2,
          maxDailyLoss: 500,
          theme: "dark",
          notifications: true,
        };
  } catch {
    return {
      apiUrl: API_BASE_URL,
      riskPerTrade: 2,
      maxDailyLoss: 500,
      theme: "dark",
      notifications: true,
    };
  }
}

export function saveAppSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getTradeHistory() {
  try {
    const saved = localStorage.getItem(TRADE_HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveTradeHistory(trades) {
  localStorage.setItem(TRADE_HISTORY_KEY, JSON.stringify(trades));
}

export { API_BASE_URL };

export async function fetchStockHistory(symbol, period = "1mo") {
  try {
    const response = await fetch(
      `${API_URL}/stock/history/${symbol}?period=${period}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch stock history");
    }
    return await response.json();
  } catch (error) {
    console.error("Stock history error:", error);
    return null;
  }
}