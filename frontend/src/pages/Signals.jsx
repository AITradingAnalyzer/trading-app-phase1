import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw } from "lucide-react";
import { fetchSignals } from "../api";
import "../styles/Pages.css";

const mockSignals = [
  { id: 1, symbol: "INFY", type: "BUY", price: 1850.5, confidence: 85, timestamp: "2026-07-15 10:30 AM" },
  { id: 2, symbol: "TCS", type: "SELL", price: 3420.25, confidence: 72, timestamp: "2026-07-15 09:45 AM" },
  { id: 3, symbol: "WIPRO", type: "BUY", price: 410.8, confidence: 68, timestamp: "2026-07-15 09:15 AM" },
];

function Signals() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [usingMock, setUsingMock] = useState(false);

  const loadSignals = async () => {
    setLoading(true);
    setError("");
    setUsingMock(false);

    try {
      const data = await fetchSignals();
      const list = Array.isArray(data) ? data : data.signals || [];
      setSignals(list);
      if (list.length === 0) {
        setSignals(mockSignals);
        setUsingMock(true);
      }
    } catch (err) {
      console.error("Failed to load signals:", err);
      setError("Backend unavailable. Showing sample data.");
      setSignals(mockSignals);
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSignals();
  }, []);

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 className="page-title" style={{ margin: 0, border: "none", padding: 0 }}>
          Trading Signals
        </h1>
        <button className="btn btn-secondary" onClick={loadSignals} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p>⏳ Loading signals from Railway...</p>
        </div>
      )}

      {!loading && error && (
        <div className="card" style={{ borderColor: "#ffa500", marginBottom: "1rem" }}>
          <p style={{ color: "#ffa500", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={18} /> {error}
          </p>
        </div>
      )}

      {!loading && usingMock && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <p style={{ color: "#b0b0b0", fontSize: "0.9rem" }}>
            ⚠️ Showing sample data. Connect to Railway backend to see live signals.
          </p>
        </div>
      )}

      {!loading && (
        <div className="signals-table">
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Signal</th>
                <th>Price</th>
                <th>Confidence</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {signals.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "#b0b0b0", padding: "2rem" }}>
                    No signals found.
                  </td>
                </tr>
              ) : (
                signals.map((signal, index) => {
                  const signalType = (signal.type || signal.signal || "HOLD").toUpperCase();
                  const confidence = Number(signal.confidence || 0);
                  const price = Number(signal.price || signal.current_price || 0);
                  const time = signal.timestamp || signal.created_at || signal.time || "N/A";

                  return (
                    <tr key={signal.id || index} className={signalType === "BUY" ? "buy-signal" : signalType === "SELL" ? "sell-signal" : ""}>
                      <td className="symbol">{signal.symbol}</td>
                      <td className="signal-type">
                        <span className={`badge ${signalType.toLowerCase()}`}>
                          {signalType === "BUY" ? <TrendingUp size={16} /> : signalType === "SELL" ? <TrendingDown size={16} /> : null}
                          {signalType}
                        </span>
                      </td>
                      <td>₹{price.toFixed(2)}</td>
                      <td>
                        <div className="confidence-bar">
                          <div
                            className="confidence-fill"
                            style={{
                              width: `${confidence}%`,
                              backgroundColor: confidence >= 75 ? "#00ff41" : confidence >= 50 ? "#ffa500" : "#ff006e",
                            }}
                          ></div>
                        </div>
                        <span>{confidence}%</span>
                      </td>
                      <td className="timestamp">{time}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="card" style={{ marginTop: "2rem" }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.2rem" }}>
          <AlertCircle size={18} /> About Signals
        </h2>
        <p style={{ marginTop: "1rem", color: "#b0b0b0", lineHeight: 1.8 }}>
          Signals are generated by AI every {import.meta.env.VITE_SCHEDULER_INTERVAL || "4"} hours.
          A confidence score above 75% indicates strong conviction. Always apply your own
          analysis before trading.
        </p>
      </div>
    </div>
  );
}

export default Signals;