import { useState } from "react";
import { fetchSignalHistory } from "../api";

export default function History() {
  const [symbol, setSymbol] = useState("AAPL");
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLoadHistory() {
    setLoading(true);
    setError("");

    try {
      const data = await fetchSignalHistory(symbol);
      setHistory(data);
    } catch (err) {
      setHistory([]);
      setError(err.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>History</h1>

      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="Enter symbol"
          style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
        />
        <button onClick={handleLoadHistory} style={{ padding: "10px 16px" }}>
          Load History
        </button>
      </div>

      {loading && <p>Loading history...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ display: "grid", gap: "16px" }}>
        {history.map((item) => (
          <div
            key={item.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: "12px",
              padding: "16px",
              background: "#fff",
            }}
          >
            <p><strong>Symbol:</strong> {item.symbol}</p>
            <p><strong>Signal:</strong> {item.signal}</p>
            <p><strong>Confidence:</strong> {item.confidence}</p>
            <p><strong>Analysis:</strong> {item.analysis_text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}