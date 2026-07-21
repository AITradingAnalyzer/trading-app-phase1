import { useState } from 'react';
import {
  TrendingUp, BarChart2, Activity,
  ArrowUpRight, ArrowDownRight, Search,
  Zap, AlertCircle, RefreshCw,
  DollarSign, Newspaper, Lightbulb,
} from 'lucide-react';

// ── Set this in Netlify → Site Configuration → Environment Variables ──
const API_URL = import.meta.env.VITE_API_URL || '';

// ── Static mock data ───────────────────────────────────────────────────
const mockSignals = [
  { ticker: 'AAPL', name: 'Apple Inc.',       signal: 'BUY',  price: '$189.45', change: '+2.3%', positive: true  },
  { ticker: 'TSLA', name: 'Tesla Inc.',        signal: 'HOLD', price: '$248.90', change: '+0.8%', positive: true  },
  { ticker: 'NVDA', name: 'NVIDIA Corp.',      signal: 'BUY',  price: '$875.20', change: '+4.1%', positive: true  },
  { ticker: 'META', name: 'Meta Platforms',    signal: 'SELL', price: '$521.60', change: '-1.2%', positive: false },
  { ticker: 'MSFT', name: 'Microsoft Corp.',   signal: 'BUY',  price: '$415.30', change: '+1.8%', positive: true  },
  { ticker: 'AMZN', name: 'Amazon Inc.',       signal: 'BUY',  price: '$182.40', change: '+0.9%', positive: true  },
];

const suggestionsList = [
  { ticker: 'AAPL', name: 'Apple Inc.',       signal: 'BUY',  reason: 'Strong earnings + AI product cycle driving demand',       confidence: 87 },
  { ticker: 'NVDA', name: 'NVIDIA Corp.',      signal: 'BUY',  reason: 'AI chip demand accelerating across data centres globally', confidence: 92 },
  { ticker: 'TSLA', name: 'Tesla Inc.',        signal: 'HOLD', reason: 'Wait for margin recovery before entering position',       confidence: 68 },
  { ticker: 'META', name: 'Meta Platforms',    signal: 'SELL', reason: 'Valuation stretched, advertising revenue slowdown risk',  confidence: 74 },
  { ticker: 'MSFT', name: 'Microsoft Corp.',   signal: 'BUY',  reason: 'Azure cloud growth + Copilot enterprise adoption rising', confidence: 89 },
  { ticker: 'AMZN', name: 'Amazon Inc.',       signal: 'BUY',  reason: 'AWS reaccelerating + retail operating margins improving', confidence: 83 },
];

const statsData = [
  {
    label: 'Total Signals Today', value: '24', change: '+6 today',         positive: true,
    iconBg: '#d1fae5', iconColor: '#10b981', iconType: 'bar',
    tickers: 'AAPL, TSLA, NVDA, META, MSFT, AMZN + 18 more',
  },
  {
    label: 'BUY Signals',         value: '14', change: '+3 vs yesterday',  positive: true,
    iconBg: '#d1fae5', iconColor: '#059669', iconType: 'up',
    tickers: 'AAPL, NVDA, MSFT, AMZN, GOOGL + 9 more',
  },
  {
    label: 'SELL Signals',        value: '5',  change: '-2 vs yesterday',  positive: false,
    iconBg: '#fee2e2', iconColor: '#dc2626', iconType: 'down',
    tickers: 'META, NFLX, BABA, SNAP, LYFT',
  },
  {
    label: 'Accuracy Rate',       value: '87%',change: '+1.2% this week',  positive: true,
    iconBg: '#e0e7ff', iconColor: '#6366f1', iconType: 'activity',
    tickers: 'Based on last 500 signals tracked',
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────
function badgeStyle(signal) {
  if (signal === 'BUY')  return { bg: '#d1fae5', color: '#059669', border: '#a7f3d0' };
  if (signal === 'SELL') return { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' };
  return                        { bg: '#fef3c7', color: '#d97706', border: '#fde68a' };
}

function sentimentColor(s) {
  if (s === 'bullish') return '#059669';
  if (s === 'bearish') return '#dc2626';
  return '#d97706';
}

function getMockNews(ticker) {
  return [
    { title: `${ticker} Reports Strong Quarterly Earnings, Beats Analyst Estimates by 8%`,    source: 'Reuters',   time: '2h ago', sentiment: 'bullish' },
    { title: `Wall Street Raises ${ticker} Price Target Following New Product Demand Surge`,  source: 'Bloomberg', time: '4h ago', sentiment: 'bullish' },
    { title: `${ticker} Faces Increased Competition in Core Market Segment, Analysts Warn`,  source: 'WSJ',       time: '6h ago', sentiment: 'bearish' },
    { title: `Institutional Investors Increase ${ticker} Holdings — Latest SEC Filing Shows`, source: 'CNBC',      time: '9h ago', sentiment: 'bullish' },
  ];
}

function StatIcon({ type, color }) {
  if (type === 'bar')      return <BarChart2 size={17} color={color} />;
  if (type === 'up')       return <ArrowUpRight size={17} color={color} />;
  if (type === 'down')     return <ArrowDownRight size={17} color={color} />;
  if (type === 'activity') return <Activity size={17} color={color} />;
  return null;
}

// ── Shared card base style ───────────────────────────────────────────────
const C = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '14px',
  padding: '20px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
};

// ── Component ────────────────────────────────────────────────────────────
export default function Home() {
  const [ticker,   setTicker]   = useState('');
  const [search,   setSearch]   = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // ── Analyze handler ──────────────────────────────────────────────────
  const handleAnalyze = async () => {
    const t = ticker.trim().toUpperCase();
    if (!t) { setError('Please enter a ticker symbol  e.g.  AAPL  or  TSLA'); return; }
    if (!API_URL) {
      setError('API URL not set. Go to Netlify → Site Configuration → Environment Variables → add VITE_API_URL with your Railway backend URL.');
      return;
    }
    setLoading(true);
    setError('');
    setAnalysis(null);
    try {
      const res = await fetch(`${API_URL}/analyze/${t}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned ${res.status}`);
      }
      const data = await res.json();
      setAnalysis({ ...data, ticker: t });
    } catch (err) {
      setError(err.message || 'Analysis failed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = mockSignals.filter(s =>
    s.ticker.toLowerCase().includes(search.toLowerCase()) ||
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div style={{
      background: '#f1f5f9',
      minHeight: '100vh',
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>

      {/* ════════════════ HEADER ════════════════ */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 28px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 8px rgba(0,0,0,0.07)',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px', height: '38px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(16,185,129,0.4)',
          }}>
            <TrendingUp size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Trading Companion</span>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>by Waseem</span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '0.3px' }}>
              AI-Powered Market Intelligence
            </div>
          </div>
        </div>

        {/* Search — filters Recent Signals list */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: '#f8fafc', border: '1.5px solid #e2e8f0',
          borderRadius: '10px', padding: '8px 14px', width: '280px',
        }}>
          <Search size={15} color="#94a3b8" />
          <input
            type="text"
            placeholder="Filter signals — AAPL, Tesla…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              fontSize: '13px', color: '#334155', width: '100%',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, fontSize: '14px' }}
            >✕</button>
          )}
        </div>

        {/* Live badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: '#d1fae5', border: '1px solid #a7f3d0',
          borderRadius: '20px', padding: '5px 14px',
        }}>
          <div style={{
            width: '7px', height: '7px', background: '#10b981',
            borderRadius: '50%', boxShadow: '0 0 6px #10b981',
          }} />
          <span style={{ fontSize: '12px', color: '#059669', fontWeight: '700' }}>LIVE</span>
        </div>
      </header>

      {/* ════════════════ HERO ════════════════ */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #0d9488 100%)',
        padding: '52px 32px',
        textAlign: 'center',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: '-50px', right: '8%',  width: '220px', height: '220px', background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-70px', left: '4%', width: '280px', height: '280px', background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '20px', padding: '5px 14px', marginBottom: '18px',
          }}>
            <Zap size={13} color="#a7f3d0" />
            <span style={{ fontSize: '12px', color: '#a7f3d0', fontWeight: '600', letterSpacing: '0.3px' }}>
              Powered by AI · Real-time Signals
            </span>
          </div>
          <h1 style={{ fontSize: '38px', fontWeight: '800', margin: '0 0 12px', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
            Smarter Trading Decisions
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.72)', margin: '0 auto', maxWidth: '460px', lineHeight: 1.7 }}>
            Get instant <strong style={{ color: '#6ee7b7' }}>BUY / SELL / HOLD</strong> signals on any stock,
            powered by AI analysis of market data and live news.
          </p>
        </div>
      </div>

      {/* ════════════════ MAIN ════════════════ */}
      <main style={{ padding: '28px 28px 40px', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* ─── ANALYZE A STOCK ─── */}
        <div style={{ ...C, marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Zap size={18} color="#059669" />
            <span style={{ fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>Analyze a Stock</span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 18px', lineHeight: 1.5 }}>
            Enter any ticker and press <strong>Analyze</strong> to get the current price, AI signal, reasoning, and latest news.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Enter ticker  e.g.  AAPL  ·  TSLA  ·  NVDA  ·  RELIANCE.NS"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              style={{
                flex: 1, minWidth: '220px',
                border: '1.5px solid #e2e8f0', borderRadius: '10px',
                padding: '13px 16px', fontSize: '15px', color: '#0f172a',
                outline: 'none', fontWeight: '600', letterSpacing: '1px',
                background: '#f8fafc',
              }}
            />
            <button
              onClick={handleAnalyze}
              disabled={loading}
              style={{
                background: loading
                  ? '#6ee7b7'
                  : 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none', borderRadius: '10px', padding: '13px 30px',
                color: '#fff', fontSize: '15px', fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(16,185,129,0.35)',
                whiteSpace: 'nowrap',
              }}
            >
              {loading ? (
                <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing…</>
              ) : (
                <><TrendingUp size={16} /> Analyze</>
              )}
            </button>
          </div>

          {/* Error box */}
          {error && (
            <div style={{
              marginTop: '16px', padding: '14px 16px',
              background: '#fee2e2', border: '1px solid #fca5a5',
              borderRadius: '10px', display: 'flex', alignItems: 'flex-start', gap: '10px',
            }}>
              <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#dc2626' }}>Error</div>
                <div style={{ fontSize: '13px', color: '#b91c1c', marginTop: '2px', lineHeight: 1.5 }}>{error}</div>
              </div>
            </div>
          )}
        </div>

        {/* ─── ANALYSIS RESULTS (shows only after search) ─── */}
        {analysis && !loading && (() => {
          const bs = badgeStyle(analysis.signal);
          const news = (Array.isArray(analysis.news) && analysis.news.length > 0)
            ? analysis.news
            : getMockNews(analysis.ticker);

          return (
            <div style={{ marginBottom: '24px' }}>

              {/* Row 1: Current Price · Signal · Confidence · Sentiment */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '14px',
                marginBottom: '14px',
              }}>
                {/* Current Price */}
                <div style={{ ...C, borderTop: '3px solid #0ea5e9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <DollarSign size={14} color="#0ea5e9" />
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Current Price
                    </span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>
                    {analysis.current_price
                      ? `$${Number(analysis.current_price).toFixed(2)}`
                      : 'N/A'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{analysis.ticker}</div>
                </div>

                {/* Signal */}
                <div style={{ ...C, borderTop: `3px solid ${bs.color}`, background: bs.bg }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    AI Signal
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: bs.color }}>{analysis.signal}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    {analysis.ticker} · AI Recommended
                  </div>
                </div>

                {/* Confidence */}
                <div style={{ ...C, borderTop: '3px solid #6366f1' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Confidence
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: '#6366f1' }}>
                    {Math.round((analysis.confidence || 0) * 100)}%
                  </div>
                  <div style={{ background: '#e0e7ff', borderRadius: '100px', height: '6px', marginTop: '10px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.round((analysis.confidence || 0) * 100)}%`,
                      height: '100%', background: '#6366f1', borderRadius: '100px',
                    }} />
                  </div>
                </div>

                {/* Sentiment */}
                <div style={{ ...C, borderTop: `3px solid ${sentimentColor(analysis.sentiment)}` }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Sentiment
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: sentimentColor(analysis.sentiment), textTransform: 'capitalize' }}>
                    {analysis.sentiment || 'Neutral'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Market sentiment</div>
                </div>
              </div>

              {/* Row 2: Reasoning · Key Drivers · Risk Factors */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '14px',
                marginBottom: '14px',
              }}>
                {analysis.reasoning && (
                  <div style={C}>
                    <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      🤖 AI Reasoning
                    </div>
                    <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.7 }}>{analysis.reasoning}</div>
                  </div>
                )}
                {analysis.key_drivers && (
                  <div style={C}>
                    <div style={{ fontSize: '11px', color: '#059669', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      ✅ Key Drivers
                    </div>
                    <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.7 }}>{analysis.key_drivers}</div>
                  </div>
                )}
                {analysis.risk_factors && (
                  <div style={C}>
                    <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      ⚠️ Risk Factors
                    </div>
                    <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.7 }}>{analysis.risk_factors}</div>
                  </div>
                )}
              </div>

              {/* Row 3: NEWS */}
              <div style={C}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Newspaper size={17} color="#f59e0b" />
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                    Latest News — {analysis.ticker}
                  </span>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '12px',
                }}>
                  {news.slice(0, 4).map((item, i) => {
                    const isObj = typeof item === 'object' && item !== null;
                    const title     = isObj ? (item.title || item.headline || String(item)) : String(item);
                    const source    = isObj ? (item.source || item.publisher || 'Market News') : 'Market News';
                    const time      = isObj ? (item.time || item.published_at || '—') : '—';
                    const sentiment = isObj ? (item.sentiment || 'neutral') : 'neutral';
                    const sc = sentiment === 'bullish' ? '#059669'
                             : sentiment === 'bearish' ? '#dc2626'
                             : '#d97706';
                    return (
                      <div key={i} style={{
                        background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: '10px', padding: '14px',
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', lineHeight: 1.5, marginBottom: '10px' }}>
                          {title}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>{source} · {time}</span>
                          <span style={{ fontSize: '11px', color: sc, fontWeight: '700', textTransform: 'capitalize' }}>
                            {sentiment}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ─── AI STOCK SUGGESTIONS ─── */}
        <div style={{ ...C, marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Lightbulb size={18} color="#f59e0b" />
            <span style={{ fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>AI Stock Suggestions</span>
            <span style={{
              fontSize: '11px', color: '#64748b', background: '#f1f5f9',
              padding: '2px 8px', borderRadius: '20px', fontWeight: '600',
            }}>Updated daily</span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 18px', lineHeight: 1.5 }}>
            AI-generated daily picks based on market trends, earnings momentum, and technical signals.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {suggestionsList.map((s, i) => {
              const bs = badgeStyle(s.signal);
              return (
                <div key={i} style={{
                  background: '#f8fafc',
                  border: `1px solid ${bs.border}`,
                  borderLeft: `4px solid ${bs.color}`,
                  borderRadius: '12px',
                  padding: '16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{s.ticker}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>{s.name}</div>
                    </div>
                    <span style={{
                      background: bs.bg, color: bs.color, border: `1px solid ${bs.border}`,
                      borderRadius: '6px', padding: '3px 10px',
                      fontSize: '12px', fontWeight: '700',
                    }}>{s.signal}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.6, marginBottom: '12px' }}>
                    {s.reason}
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>Confidence</span>
                      <span style={{ fontSize: '11px', color: bs.color, fontWeight: '700' }}>{s.confidence}%</span>
                    </div>
                    <div style={{ background: '#e2e8f0', borderRadius: '100px', height: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${s.confidence}%`, height: '100%', background: bs.color, borderRadius: '100px' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── RECENT SIGNALS + MARKET SENTIMENT ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginBottom: '24px',
        }}>
          {/* Recent Signals */}
          <div style={C}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Activity size={17} color="#059669" />
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Recent Signals</span>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 14px' }}>
              Use the search bar in the header to filter by ticker or company name
            </p>

            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px', color: '#94a3b8', fontSize: '14px' }}>
                No signals match <strong>"{search}"</strong>
              </div>
            ) : filtered.map((s, i) => {
              const bs = badgeStyle(s.signal);
              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>{s.ticker}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{s.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-block',
                      background: bs.bg, color: bs.color, border: `1px solid ${bs.border}`,
                      borderRadius: '20px', padding: '3px 12px',
                      fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px',
                    }}>{s.signal}</span>
                    <div style={{
                      fontSize: '12px',
                      color: s.positive ? '#059669' : '#dc2626',
                      marginTop: '4px', fontWeight: '600',
                    }}>
                      {s.price} &nbsp; {s.change}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Market Sentiment */}
          <div style={C}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <BarChart2 size={17} color="#6366f1" />
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Market Sentiment</span>
            </div>
            {[
              { label: 'Bullish', pct: 58, color: '#059669' },
              { label: 'Neutral', pct: 25, color: '#d97706' },
              { label: 'Bearish', pct: 17, color: '#dc2626' },
            ].map((s, i) => (
              <div key={i} style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                  <span style={{ fontSize: '14px', color: '#334155', fontWeight: '500' }}>{s.label}</span>
                  <span style={{ fontSize: '14px', color: s.color, fontWeight: '700' }}>{s.pct}%</span>
                </div>
                <div style={{ background: '#f1f5f9', borderRadius: '100px', height: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${s.pct}%`, height: '100%', background: s.color, borderRadius: '100px' }} />
                </div>
              </div>
            ))}
            <div style={{ padding: '14px', background: '#d1fae5', border: '1px solid #a7f3d0', borderRadius: '10px' }}>
              <div style={{ fontSize: '14px', color: '#059669', fontWeight: '700', marginBottom: '3px' }}>
                📈 Overall: Bullish Market
              </div>
              <div style={{ fontSize: '12px', color: '#047857' }}>
                Based on AI analysis of 24 signals today
              </div>
            </div>
          </div>
        </div>

        {/* ─── SIGNAL STATS AT BOTTOM (with stock names) ─── */}
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 14px' }}>
            Today's Signal Summary
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
            {statsData.map((s, i) => (
              <div key={i} style={C}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>{s.label}</span>
                  <div style={{
                    width: '32px', height: '32px', background: s.iconBg,
                    borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <StatIcon type={s.iconType} color={s.iconColor} />
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                  {s.value}
                </div>
                <div style={{
                  fontSize: '12px', color: s.positive ? '#059669' : '#dc2626',
                  display: 'flex', alignItems: 'center', gap: '3px',
                  fontWeight: '600', marginBottom: '12px',
                }}>
                  {s.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {s.change}
                </div>
                <div style={{ paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    Stocks
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>{s.tickers}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}