import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { fetchSignals } from "../api";
import "../styles/Pages.css";

function Suggestions() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSignals = async () => {
      try {
        const data = await fetchSignals();
        setSignals(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || "Failed to load suggestions");
      } finally {
        setLoading(false);
      }
    };

    loadSignals();
  }, []);

  const buySignals = signals.filter((s) => s.signal === "BUY");
  const sellSignals = signals.filter((s) => s.signal === "SELL");

  return (
    <div className="page-container">
      <h2 className="page-title">Suggestions</h2>
      <p className="page-subtitle">
        Best buy and sell suggestions generated from the backend.
      </p>

      {loading && <div className="info-card">Loading suggestions...</div>}
      {error && <div className="error-box">{error}</div>}

      {!loading && !error && (
        <div className="home-grid">
          <div className="info-card full-width">
            <h3>
              <TrendingUp size={18} style={{ display: "inline", marginRight: "8px" }} />
              Best Buy Suggestions
            </h3>
            {buySignals.length > 0 ? (
              <ul className="suggestion-list">
                {buySignals.map((item, index) => (
                  <li key={index} className="suggestion-item">
                    <strong>{item.symbol}</strong> — Confidence: {item.confidence}%
                    <p>{item.analysis_text || item.reasoning || "No details"}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No BUY suggestions available right now.</p>
            )}
          </div>

          <div className="info-card full-width">
            <h3>
              <TrendingDown size={18} style={{ display: "inline", marginRight: "8px" }} />
              Best Sell Suggestions
            </h3>
            {sellSignals.length > 0 ? (
              <ul className="suggestion-list">
                {sellSignals.map((item, index) => (
                  <li key={index} className="suggestion-item">
                    <strong>{item.symbol}</strong> — Confidence: {item.confidence}%
                    <p>{item.analysis_text || item.reasoning || "No details"}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No SELL suggestions available right now.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Suggestions;