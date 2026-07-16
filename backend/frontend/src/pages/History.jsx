import { useEffect, useState } from "react";
import { Trash2, Download, History as HistoryIcon } from "lucide-react";
import "../styles/Pages.css";

const STORAGE_KEY = "trade_history";

function History() {
  const [trades, setTrades] = useState([]);
  const [activeTab, setActiveTab] = useState("manual");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setTrades(JSON.parse(saved));
      } catch {
        setTrades([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  }, [trades]);

  const addTrade = () => {
    const symbol = prompt("Enter symbol (e.g., INFY):");
    if (!symbol) return;
    const type = prompt("Enter type (BUY/SELL):");
    if (!type || !["BUY", "SELL"].includes(type.toUpperCase())) return;
    const entry = parseFloat(prompt("Entry price:"));
    if (isNaN(entry)) return;
    const exit = parseFloat(prompt("Exit price:"));
    if (isNaN(exit)) return;
    const qty = parseInt(prompt("Quantity:"), 10);
    if (isNaN(qty)) return;

    const pnl = type.toUpperCase() === "BUY" ? (exit - entry) * qty : (entry - exit) * qty;

    const newTrade = {
      id: Date.now(),
      symbol: symbol.toUpperCase(),
      type: type.toUpperCase(),
      entryPrice: entry,
      exitPrice: exit,
      quantity: qty,
      pnl: Math.round(pnl * 100) / 100,
      date: new Date().toLocaleDateString("en-IN"),
    };

    setTrades((prev) => [newTrade, ...prev]);
  };

  const deleteTrade = (id) => {
    setTrades((prev) => prev.filter((t) => t.id !== id));
  };

  const clearAll = () => {
    if (confirm("Delete all trade history?")) {
      setTrades([]);
    }
  };

  const exportCSV = () => {
    if (trades.length === 0) return;
    const headers = ["Symbol", "Type", "Entry", "Exit", "Qty", "P&L", "Date"];
    const rows = trades.map((t) => [t.symbol, t.type, t.entryPrice, t.exitPrice, t.quantity, t.pnl, t.date]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trade-history-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const winCount = trades.filter((t) => t.pnl > 0).length;
  const winRate = trades.length > 0 ? ((winCount / trades.length) * 100).toFixed(1) : "0";

  return (
    <div className="page">
      <h1 className="page-title">Trade History</h1>

      {/* Summary Cards */}
      <div className="history-stats">
        <div className="stat-card">
          <p className="stat-label">Total P&L</p>
          <p className="stat-value" style={{ color: totalPnL >= 0 ? "#00ff41" : "#ff006e" }}>
            ₹{totalPnL.toFixed(2)}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Win Rate</p>
          <p className="stat-value">{winRate}%</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total Trades</p>
          <p className="stat-value">{trades.length}</p>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <button className="btn btn-primary" onClick={addTrade}>
          + Add Trade
        </button>
        <button className="btn btn-secondary" onClick={exportCSV} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Download size={16} /> Export CSV
        </button>
        {trades.length > 0 && (
          <button className="btn btn-danger" onClick={clearAll} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Trash2 size={16} /> Clear All
          </button>
        )}
      </div>

      {/* Trades Table */}
      <div className="card">
        {trades.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <HistoryIcon size={48} style={{ color: "#0f3460", marginBottom: "1rem" }} />
            <p style={{ color: "#b0b0b0", fontSize: "1.1rem" }}>No trade history yet</p>
            <p style={{ color: "#666", marginTop: "0.5rem" }}>Click "Add Trade" to log your first trade.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Type</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Qty</th>
                  <th>P&L</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id}>
                    <td className="symbol">{trade.symbol}</td>
                    <td>
                      <span className={`badge ${trade.type.toLowerCase()}`} style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}>
                        {trade.type}
                      </span>
                    </td>
                    <td>₹{trade.entryPrice.toFixed(2)}</td>
                    <td>₹{trade.exitPrice.toFixed(2)}</td>
                    <td>{trade.quantity}</td>
                    <td style={{ color: trade.pnl >= 0 ? "#00ff41" : "#ff006e", fontWeight: "bold" }}>
                      {trade.pnl >= 0 ? "+" : ""}₹{trade.pnl.toFixed(2)}
                    </td>
                    <td className="timestamp">{trade.date}</td>
                    <td>
                      <button className="btn btn-danger" onClick={() => deleteTrade(trade.id)} style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default History;