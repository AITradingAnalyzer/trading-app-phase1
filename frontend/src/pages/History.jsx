import { useState, useEffect } from 'react';
import { Trash2, Download } from 'lucide-react';
import '../styles/Pages.css';

function History() {
  const [trades, setTrades] = useState([
    {
      id: 1,
      symbol: 'INFY',
      type: 'BUY',
      entryPrice: 1850.50,
      exitPrice: 1875.25,
      quantity: 5,
      pnl: 123.75,
      date: '2024-01-14',
    },
    {
      id: 2,
      symbol: 'TCS',
      type: 'SELL',
      entryPrice: 3420.25,
      exitPrice: 3390.50,
      quantity: 3,
      pnl: 89.25,
      date: '2024-01-13',
    },
  ]);

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('tradeHistory');
    if (saved) {
      try {
        setTrades(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading trades:', e);
      }
    }
  }, []);

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('tradeHistory', JSON.stringify(trades));
  }, [trades]);

  const deleteTrade = (id) => {
    setTrades(trades.filter(t => t.id !== id));
  };

  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const winRate = trades.length > 0
    ? ((trades.filter(t => t.pnl > 0).length / trades.length) * 100).toFixed(1)
    : 0;

  return (
    <div className="page">
      <h1 className="page-title">Trade History</h1>

      <div className="history-stats">
        <div className="stat-card">
          <p className="stat-label">Total P&L</p>
          <p className="stat-value" style={{ color: totalPnL > 0 ? '#00ff41' : '#ff006e' }}>
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

      <div className="card" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Recent Trades</h2>
          <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Export CSV
          </button>
        </div>

        {trades.length === 0 ? (
          <p style={{ color: '#b0b0b0', marginTop: '1rem' }}>No trades recorded yet.</p>
        ) : (
          <table style={{ width: '100%', marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Type</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>Qty</th>
                <th>P&L</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id}>
                  <td className="symbol">{trade.symbol}</td>
                  <td>{trade.type}</td>
                  <td>₹{trade.entryPrice.toFixed(2)}</td>
                  <td>₹{trade.exitPrice.toFixed(2)}</td>
                  <td>{trade.quantity}</td>
                  <td style={{ color: trade.pnl > 0 ? '#00ff41' : '#ff006e', fontWeight: 'bold' }}>
                    ₹{trade.pnl.toFixed(2)}
                  </td>
                  <td className="timestamp">{trade.date}</td>
                  <td>
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteTrade(trade.id)}
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default History;