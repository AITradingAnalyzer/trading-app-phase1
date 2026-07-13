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

export { API_BASE_URL };
