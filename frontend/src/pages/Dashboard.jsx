import { TrendingUp, AlertCircle, Activity, DollarSign } from 'lucide-react';
import '../styles/Pages.css';

function Dashboard() {
  const stats = [
    { label: 'Portfolio Value', value: '$24,850', icon: DollarSign, color: '#00d4ff' },
    { label: 'Today\'s P&L', value: '+$340.50', icon: TrendingUp, color: '#00ff41' },
    { label: 'Active Signals', value: '3', icon: AlertCircle, color: '#ff006e' },
    { label: 'Win Rate', value: '68%', icon: Activity, color: '#00d4ff' },
  ];

  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>
      
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon" style={{ color: stat.color }}>
              <stat.icon size={32} />
            </div>
            <div className="stat-content">
              <p className="stat-label">{stat.label}</p>
              <p className="stat-value">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Recent Activity</h2>
        <p style={{ marginTop: '1rem', color: '#b0b0b0' }}>
          No recent activity. Start trading to see updates here.
        </p>
      </div>
    </div>
  );
}

export default Dashboard;