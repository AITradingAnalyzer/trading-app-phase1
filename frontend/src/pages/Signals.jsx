import { useState } from 'react';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import '../styles/Pages.css';

function Signals() {
  const [signals] = useState([
    {
      id: 1,
      symbol: 'INFY',
      type: 'BUY',
      price: 1850.50,
      confidence: 85,
      timestamp: '2024-01-15 10:30 AM',
    },
    {
      id: 2,
      symbol: 'TCS',
      type: 'SELL',
      price: 3420.25,
      confidence: 72,
      timestamp: '2024-01-15 09:45 AM',
    },
    {
      id: 3,
      symbol: 'WIPRO',
      type: 'BUY',
      price: 410.80,
      confidence: 68,
      timestamp: '2024-01-15 09:15 AM',
    },
  ]);

  return (
    <div className="page">
      <h1 className="page-title">Trading Signals</h1>

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
            {signals.map((signal) => (
              <tr key={signal.id} className={signal.type === 'BUY' ? 'buy-signal' : 'sell-signal'}>
                <td className="symbol">{signal.symbol}</td>
                <td className="signal-type">
                  <span className={`badge ${signal.type.toLowerCase()}`}>
                    {signal.type === 'BUY' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {signal.type}
                  </span>
                </td>
                <td>₹{signal.price.toFixed(2)}</td>
                <td>
                  <div className="confidence-bar">
                    <div
                      className="confidence-fill"
                      style={{ width: `${signal.confidence}%`, backgroundColor: signal.confidence > 75 ? '#00ff41' : '#ffa500' }}
                    ></div>
                  </div>
                  <span>{signal.confidence}%</span>
                </td>
                <td className="timestamp">{signal.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={20} /> About Signals
        </h2>
        <p style={{ marginTop: '1rem', color: '#b0b0b0' }}>
          Signals are generated based on AI analysis of market data. Confidence score indicates
          the probability of a successful trade. Always apply your own analysis before trading.
        </p>
      </div>
    </div>
  );
}

export default Signals;