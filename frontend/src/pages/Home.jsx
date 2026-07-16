import { useState } from "react";
import { Search, ArrowUpRight, ArrowDownRight, Newspaper } from "lucide-react";
import "../styles/Pages.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function Home() {
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!symbol.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/analyze/${symbol.trim().toUpperCase()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to fetch stock data");
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h2 className="page-title">Home</h2>
      <p className="page-subtitle">
        Search any stock to view current price, news, past performance, and AI suggestion.
      </p>

      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Enter stock symbol like AAPL, TSLA, TCS"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="search-button" disabled={loading}>
          <Search size={16} />
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <div className="error-box">{error}</div>}

      {result && (
        <div className="home-grid">
          <div className="info-card">
            <h3>Current Price</h3>
            <p className="price-value">
              {result.stock_data?.price ? `$${result.stock_data.price}` : "N/A"}
            </p>
          </div>

          <div className="info-card">
            <h3>AI Suggestion</h3>
            <div className="signal-badge">
              {result.ai_analysis?.signal === "BUY" ? (
                <ArrowUpRight size={16} />
              ) : result.ai_analysis?.signal === "SELL" ? (
                <ArrowDownRight size={16} />
              ) : null}
              {result.ai_analysis?.signal || "HOLD"}
            </div>
            <p>Confidence: {result.ai_analysis?.confidence ?? 0}%</p>
          </div>

          <div className="info-card full-width">
            <h3>Reasoning</h3>
            <p>{result.ai_analysis?.reasoning || "No reasoning available"}</p>
          </div>

          <div className="info-card full-width">
            <h3>
              <Newspaper size={18} style={{ display: "inline", marginRight: "8px" }} />
              Latest News
            </h3>
            {Array.isArray(result.news) && result.news.length > 0 ? (
              <ul className="news-list">
                {result.news.slice(0, 5).map((item, index) => (
                  <li key={index} className="news-item">
                    <strong>{item.headline || item.title}</strong>
                    <p>{item.summary || "No summary available"}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No news found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;