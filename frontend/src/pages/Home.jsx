import {
  TrendingUp,
  BarChart2,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Bell,
  RefreshCw,
  Zap,
  Shield,
  Clock,
} from 'lucide-react';

const styles = {
  page: {
    flex: 1,
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    background: '#0b0f1a',
    color: '#e2e8f0',
    minHeight: '100vh',
  },
  header: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1a1f35 100%)',
    borderBottom: '1px solid #1e293b',
    padding: '0 32px',
    height: '70px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconWrap: {
    width: '42px',
    height: '42px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 16px rgba(16,185,129,0.4)',
  },
  brandText: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.1,
  },
  brandRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '7px',
  },
  brandName: {
    fontSize: '20px',
    fontWeight: '700',
    background: 'linear-gradient(90deg, #10b981, #6ee7b7)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '-0.3px',
  },
  brandBy: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#64748b',
    letterSpacing: '0.3px',
  },
  brandTagline: {
    fontSize: '11px',
    color: '#475569',
    letterSpacing: '0.5px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '8px 14px',
    color: '#94a3b8',
    fontSize: '14px',
  },
  iconBtn: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '8px',
    cursor: 'pointer',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(16,185,129,0.1)',
    border: '1px solid rgba(16,185,129,0.3)',
    borderRadius: '20px',
    padding: '5px 12px',
    fontSize: '12px',
    color: '#10b981',
    fontWeight: '600',
  },
  dot: {
    width: '7px',
    height: '7px',
    background: '#10b981',
    borderRadius: '50%',
    boxShadow: '0 0 6px #10b981',
  },
  main: {
    padding: '32px',
    maxWidth: '1280px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  pageHeader: {
    marginBottom: '28px',
  },
  pageTitle: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: '4px',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: '#64748b',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
    marginBottom: '28px',
  },
  statCard: {
    background: 'linear-gradient(135deg, #111827 0%, #1a2235 100%)',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '22px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  statTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500',
  },
  statIconWrap: (color) => ({
    width: '36px',
    height: '36px',
    background: color,
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#f1f5f9',
    lineHeight: 1,
  },
  statChange: (positive) => ({
    fontSize: '12px',
    color: positive ? '#10b981' : '#ef4444',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    fontWeight: '600',
  }),
  analyzeCard: {
    background: 'linear-gradient(135deg, #111827 0%, #1a2235 100%)',
    border: '1px solid #1e293b',
    borderRadius: '20px',
    padding: '28px',
    marginBottom: '28px',
  },
  cardTitle: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: '18px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  inputRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    minWidth: '200px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '12px 16px',
    color: '#e2e8f0',
    fontSize: '15px',
    outline: 'none',
    letterSpacing: '1px',
  },
  analyzeBtn: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 28px',
    color: '#fff',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
    whiteSpace: 'nowrap',
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '28px',
  },
  panel: {
    background: 'linear-gradient(135deg, #111827 0%, #1a2235 100%)',
    border: '1px solid #1e293b',
    borderRadius: '20px',
    padding: '24px',
  },
  signalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 0',
    borderBottom: '1px solid #1e293b',
  },
  tickerName: {
    fontWeight: '700',
    fontSize: '15px',
    color: '#f1f5f9',
  },
  tickerSub: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '2px',
  },
  badge: (type) => {
    const map = {
      BUY: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
      SELL: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
      HOLD: { bg: 'rgba(234,179,8,0.15)', color: '#eab308', border: 'rgba(234,179,8,0.3)' },
    };
    const s = map[type] || map.HOLD;
    return {
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      borderRadius: '20px',
      padding: '4px 14px',
      fontSize: '12px',
      fontWeight: '700',
      letterSpacing: '0.5px',
    };
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  featureCard: (color) => ({
    background: 'linear-gradient(135deg, #111827 0%, #1a2235 100%)',
    border: `1px solid ${color}30`,
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  }),
  featureIcon: (color) => ({
    width: '40px',
    height: '40px',
    background: `${color}20`,
    border: `1px solid ${color}40`,
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  featureTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#e2e8f0',
  },
  featureDesc: {
    fontSize: '12px',
    color: '#64748b',
    lineHeight: 1.5,
  },
};

const mockSignals = [
  { ticker: 'AAPL', name: 'Apple Inc.', signal: 'BUY', price: '$189.45', change: '+2.3%', positive: true },
  { ticker: 'TSLA', name: 'Tesla Inc.', signal: 'HOLD', price: '$248.90', change: '+0.8%', positive: true },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', signal: 'BUY', price: '$875.20', change: '+4.1%', positive: true },
  { ticker: 'META', name: 'Meta Platforms', signal: 'SELL', price: '$521.60', change: '-1.2%', positive: false },
];

export default function Home() {
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.iconWrap}>
            <TrendingUp size={22} color="#fff" strokeWidth={2.5} />
          </div>
          <div style={styles.brandText}>
            <div style={styles.brandRow}>
              <span style={styles.brandName}>Trading Companion</span>
              <span style={styles.brandBy}>by Waseem</span>
            </div>
            <span style={styles.brandTagline}>AI-Powered Market Intelligence</span>
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.searchBox}>
            <Search size={15} />
            <span>Search ticker...</span>
          </div>
          <button style={styles.iconBtn}>
            <Bell size={16} />
          </button>
          <button style={styles.iconBtn}>
            <RefreshCw size={16} />
          </button>
          <div style={styles.liveDot}>
            <div style={styles.dot} />
            LIVE
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>Market Overview</h1>
          <p style={styles.pageSubtitle}>Real-time AI signals • Updated just now</p>
        </div>

        <div style={styles.statsGrid}>
          {[
            { label: 'Total Signals Today', value: '24', change: '+6 today', positive: true, iconColor: 'rgba(16,185,129,0.2)', icon: <BarChart2 size={18} color="#10b981" /> },
            { label: 'BUY Signals', value: '14', change: '+3 vs yesterday', positive: true, iconColor: 'rgba(16,185,129,0.2)', icon: <ArrowUpRight size={18} color="#10b981" /> },
            { label: 'SELL Signals', value: '5', change: '-2 vs yesterday', positive: false, iconColor: 'rgba(239,68,68,0.15)', icon: <ArrowDownRight size={18} color="#ef4444" /> },
            { label: 'Accuracy Rate', value: '87%', change: '+1.2% this week', positive: true, iconColor: 'rgba(99,102,241,0.2)', icon: <Activity size={18} color="#818cf8" /> },
          ].map((s, i) => (
            <div key={i} style={styles.statCard}>
              <div style={styles.statTop}>
                <span style={styles.statLabel}>{s.label}</span>
                <div style={styles.statIconWrap(s.iconColor)}>{s.icon}</div>
              </div>
              <div style={styles.statValue}>{s.value}</div>
              <div style={styles.statChange(s.positive)}>
                {s.positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {s.change}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.analyzeCard}>
          <div style={styles.cardTitle}>
            <Zap size={18} color="#10b981" />
            Analyze a Stock
          </div>
          <div style={styles.inputRow}>
            <input
              style={styles.input}
              type="text"
              placeholder="Enter ticker (e.g. AAPL, TSLA, NVDA)"
            />
            <button style={styles.analyzeBtn}>
              <TrendingUp size={16} />
              Analyze
            </button>
          </div>
        </div>

        <div style={styles.twoCol}>
          <div style={styles.panel}>
            <div style={styles.cardTitle}>
              <Activity size={17} color="#10b981" />
              Recent Signals
            </div>
            {mockSignals.map((s, i) => (
              <div key={i} style={styles.signalRow}>
                <div>
                  <div style={styles.tickerName}>{s.ticker}</div>
                  <div style={styles.tickerSub}>{s.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={styles.badge(s.signal)}>{s.signal}</div>
                  <div style={{ fontSize: '12px', color: s.positive ? '#10b981' : '#ef4444', marginTop: '4px' }}>
                    {s.price} {s.change}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.panel}>
            <div style={styles.cardTitle}>
              <BarChart2 size={17} color="#818cf8" />
              Market Sentiment
            </div>

            {[
              { label: 'Bullish', pct: 58, color: '#10b981' },
              { label: 'Neutral', pct: 25, color: '#eab308' },
              { label: 'Bearish', pct: 17, color: '#ef4444' },
            ].map((s, i) => (
              <div key={i} style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>{s.label}</span>
                  <span style={{ fontSize: '13px', color: s.color, fontWeight: '700' }}>{s.pct}%</span>
                </div>
                <div style={{ background: '#1e293b', borderRadius: '100px', height: '8px', overflow: 'hidden' }}>
                  <div style={{ width: `${s.pct}%`, height: '100%', background: s.color, borderRadius: '100px' }} />
                </div>
              </div>
            ))}

            <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px' }}>
              <div style={{ fontSize: '13px', color: '#10b981', fontWeight: '700', marginBottom: '4px' }}>
                Overall Market: Bullish
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Based on AI analysis of 24 signals today
              </div>
            </div>
          </div>
        </div>

        <div style={styles.featureGrid}>
          {[
            { color: '#10b981', icon: <Zap size={20} color="#10b981" />, title: 'AI-Powered Signals', desc: 'Real-time BUY/SELL/HOLD signals powered by AI.' },
            { color: '#818cf8', icon: <BarChart2 size={20} color="#818cf8" />, title: 'Technical Analysis', desc: 'RSI, MACD, moving averages and more indicators.' },
            { color: '#f59e0b', icon: <Bell size={20} color="#f59e0b" />, title: 'Live News Feed', desc: 'Breaking news sentiment analyzed in real-time.' },
            { color: '#06b6d4', icon: <Shield size={20} color="#06b6d4" />, title: 'Risk Assessment', desc: 'Smart risk scoring before every trade decision.' },
            { color: '#ec4899', icon: <Clock size={20} color="#ec4899" />, title: 'Signal History', desc: 'Track past signals and review performance.' },
          ].map((f, i) => (
            <div key={i} style={styles.featureCard(f.color)}>
              <div style={styles.featureIcon(f.color)}>{f.icon}</div>
              <div style={styles.featureTitle}>{f.title}</div>
              <div style={styles.featureDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}