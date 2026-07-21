import { useState } from 'react';
import {
  TrendingUp, BarChart2, Activity,
  ArrowUpRight, ArrowDownRight, Search,
  Zap, Shield, Clock, Bell, AlertCircle, RefreshCw,
} from 'lucide-react';

// ── Set VITE_API_URL in Netlify Environment Variables ──────────────
const API_URL = import.meta.env.VITE_API_URL || '';

const mockSignals = [
  { ticker: 'AAPL', name: 'Apple Inc.',     signal: 'BUY',  price: '$189.45', change: '+2.3%', positive: true  },
  { ticker: 'TSLA', name: 'Tesla Inc.',     signal: 'HOLD', price: '$248.90', change: '+0.8%', positive: true  },
  { ticker: 'NVDA', name: 'NVIDIA Corp.',   signal: 'BUY',  price: '$875.20', change: '+4.1%', positive: true  },
  { ticker: 'META', name: 'Meta Platforms', signal: 'SELL', price: '$521.60', change: '-1.2%', positive: false },
  { ticker: 'MSFT', name: 'Microsoft Corp.',signal: 'BUY',  price: '$415.30', change: '+1.8%', positive: true  },
];

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

export default function Home() {
  const [ticker,   setTicker]   = useState('');
  const [search,   setSearch]   = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleAnalyze = async () => {
    const t = ticker.trim().toUpperCase();
    if (!t) { setError('Please enter a ticker symbol (e.g. AAPL)'); return; }
    if (!API_URL) {
      setError('API URL not configured. Add VITE_API_URL in Netlify → Site Settings → Environment Variables.');
      return;
    }
    setLoading(true);
    setError('');
    setAnalysis(null);
    try {
      const res = await fetch(`${API_URL}/analyze/${t}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error ${res.status}`);
      }
      const data = await res.json();
      setAnalysis({ ...data, ticker: t });
    } catch (err) {
      setError(err.message || 'Analysis failed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = mockSignals.filter(
    s =>
      s.ticker.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>

      {/* ──────────────────── HEADER ──────────────────── */}
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
            <div style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '0.3px' }}>AI-Powered Market Intelligence</div>
          </div>
        </div>

        {/* Search — filters signals */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: '#f8fafc', border: '1.5px solid #e2e8f0',
          borderRadius: '10px', padding: '8px 14px', width: '270px',
        }}>
          <Search size={15} color="#94a3b8" />
          <input
            type="text"
            placeholder="Filter signals (e.g. AAPL, Tesla)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', color: '#334155', width: '100%' }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, fontSize: '13px' }}>
              ✕
            </button>
          )}
        </div>

        {/* Live badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: '#d1fae5', border: '1px solid #a7f3d0',
          borderRadius: '20px', padding: '5px 14px',
        }}>
          <div style={{ width: '7px', height: '7px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 6px #10b981' }} />
          <span style={{ fontSize: '12px', color: '#059669', fontWeight: '700' }}>LIVE</span>
        </div>
      </header>

      {/* ──────────────────── HERO ──────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #0d9488 100%)',
        padding: '52px 32px',
        textAlign: 'center',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* decorative blobs */}
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
            Get instant <strong style={{ color: '#6ee7b7' }}>BUY / SELL / HOLD</strong> signals on any stock, powered by AI analysis of market data and live news.
          </p>
        </div>
      </div>

      {/* ──────────────────── MAIN ──────────────────── */}
      <main style={{ padding: '0 28px 40px', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* STAT CARDS — floats up over hero */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginTop: '-28px',
          marginBottom: '24px',
          position: 'relative',
          zIndex: 10,
        }}>
          {[
            { label: 'Total Signals Today', value: '24', change: '+6 today',         positive: true,  iconBg: '#d1fae5', icon: <BarChart2 size={18} color="#10b981" /> },
            { label: 'BUY Signals',          value: '14', change: '+3 vs yesterday', positive: true,  iconBg: '#d1fae5', icon: <ArrowUpRight size={18} color="#059669" /> },
            { label: 'SELL Signals',         value: '5',  change: '-2 vs yesterday', positive: false, iconBg: '#fee2e2', icon: <ArrowDownRight size={18} color="#dc2626" /> },
            { label: 'Accuracy Rate',        value: '87%',change: '+1.2% this week', positive: true,  iconBg: '#e0e7ff', icon: <Activity size={18} color="#6366f1" /> },
          ].map((s, i) => (
            <div key={i} style={{
              background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px',
              padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>{s.label}</span>
                <div style={{ width: '34px', height: '34px', background: s.iconBg, borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.icon}
                </div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', lineHeight: 1, marginBottom: '8px' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: s.positive ? '#059669' : '#dc2626', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '600' }}>
                {s.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {s.change}
              </div>
            </div>
          ))}
        </div>

        {/* ── ANALYZE SECTION ── */}
        <div style={{
          background: '#ffffff', border: '1px solid #e2e8f0',
          borderRadius: '16px', padding: '28px', marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Zap size={18} color="#059669" />
            <span style={{ fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>Analyze a Stock</span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
            Type any stock ticker below (US or Indian market) and click <strong>Analyze</strong> to get an AI-generated signal with reasoning.
          </p>

          {/* Input row */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Enter ticker  e.g.  AAPL  ·  TSLA  ·  INFY"
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
                background: loading ? '#6ee7b7' : 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none', borderRadius: '10px', padding: '13px 30px',
                color: '#fff', fontSize: '15px', fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(16,185,129,0.35)',
                whiteSpace: 'nowrap', transition: 'all 0.2s',
              }}
            >
              {loading
                ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing…</>
                : <><TrendingUp size={16} /> Analyze</>
              }
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
                <div style={{ fontSize: '13px', color: '#ef4444', marginTop: '2px' }}>{error}</div>
              </div>
            </div>
          )}

          {/* Result card */}
          {analysis && !loading && (() => {
            const bs = badgeStyle(analysis.signal);
            return (
              <div style={{
                marginTop: '20px',
                border: `2px solid ${bs.border}`,
                borderRadius: '14px', padding: '22px',
                background: bs.bg,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>{analysis.ticker}</div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>AI Analysis Result</div>
                  </div>
                  <div style={{
                    background: bs.color, color: '#fff',
                    borderRadius: '10px', padding: '9px 26px',
                    fontSize: '17px', fontWeight: '800', letterSpacing: '1.5px',
                  }}>
                    {analysis.signal}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
                  <div style={{ background: '#fff', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Confidence</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
                      {Math.round((analysis.confidence || 0) * 100)}%
                    </div>
                  </div>
                  <div style={{ background: '#fff', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Sentiment</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: sentimentColor(analysis.sentiment), textTransform: 'capitalize' }}>
                      {analysis.sentiment}
                    </div>
                  </div>
                  {analysis.reasoning && (
                    <div style={{ background: '#fff', borderRadius: '10px', padding: '14px', gridColumn: 'span 2' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>AI Reasoning</div>
                      <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>{analysis.reasoning}</div>
                    </div>
                  )}
                  {analysis.key_drivers && (
                    <div style={{ background: '#fff', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Key Drivers</div>
                      <div style={{ fontSize: '13px', color: '#059669', lineHeight: 1.6 }}>{analysis.key_drivers}</div>
                    </div>
                  )}
                  {analysis.risk_factors && (
                    <div style={{ background: '#fff', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Risk Factors</div>
                      <div style={{ fontSize: '13px', color: '#dc2626', lineHeight: 1.6 }}>{analysis.risk_factors}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── SIGNALS + SENTIMENT ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>

          {/* Recent Signals */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Activity size={17} color="#059669" />
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Recent Signals</span>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 16px' }}>
              Use the top search bar to filter by ticker or company name
            </p>

            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px', color: '#94a3b8', fontSize: '14px' }}>
                No signals match "<strong>{search}</strong>"
              </div>
            ) : filtered.map((s, i) => {
              const bs = badgeStyle(s.signal);
              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '13px 0',
                  borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>{s.ticker}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{s.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-block',
                      background: bs.bg, color: bs.color, border: `1px solid ${bs.border}`,
                      borderRadius: '20px', padding: '3px 13px',
                      fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px',
                    }}>{s.signal}</span>
                    <div style={{ fontSize: '12px', color: s.positive ? '#059669' : '#dc2626', marginTop: '4px', fontWeight: '600' }}>
                      {s.price} &nbsp; {s.change}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Market Sentiment */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '22px' }}>
              <BarChart2 size={17} color="#6366f1" />
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Market Sentiment</span>
            </div>

            {[
              { label: 'Bullish', pct: 58, color: '#059669' },
              { label: 'Neutral', pct: 25, color: '#d97706' },
              { label: 'Bearish', pct: 17, color: '#dc2626' },
            ].map((s, i) => (
              <div key={i} style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#334155', fontWeight: '500' }}>{s.label}</span>
                  <span style={{ fontSize: '14px', color: s.color, fontWeight: '700' }}>{s.pct}%</span>
                </div>
                <div style={{ background: '#f1f5f9', borderRadius: '100px', height: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${s.pct}%`, height: '100%', background: s.color, borderRadius: '100px' }} />
                </div>
              </div>
            ))}

            <div style={{ padding: '16px', background: '#d1fae5', border: '1px solid #a7f3d0', borderRadius: '12px', marginTop: '10px' }}>
              <div style={{ fontSize: '14px', color: '#059669', fontWeight: '700', marginBottom: '4px' }}>
                📈 Overall: Bullish Market
              </div>
              <div style={{ fontSize: '12px', color: '#047857' }}>Based on AI analysis of 24 signals today</div>
            </div>
          </div>
        </div>

        {/* ── PLATFORM FEATURES ── */}
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 16px' }}>Platform Features</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: '16px' }}>
          {[
            {
              color: '#059669', iconBg: '#d1fae5',
              icon: <Zap size={20} color="#059669" />,
              title: 'AI Stock Analysis',
              desc: 'Enter any ticker above and get an instant AI signal with reasoning and confidence score.',
              status: 'live',
            },
            {
              color: '#6366f1', iconBg: '#e0e7ff',
              icon: <BarChart2 size={20} color="#6366f1" />,
              title: 'Technical Analysis',
              desc: 'RSI, MACD, Bollinger Bands and moving average indicators.',
              status: 'soon',
            },
            {
              color: '#f59e0b', iconBg: '#fef3c7',
              icon: <Bell size={20} color="#f59e0b" />,
              title: 'Live News Feed',
              desc: 'Breaking market news analyzed for sentiment in real-time.',
              status: 'soon',
            },
            {
              color: '#0ea5e9', iconBg: '#e0f2fe',
              icon: <Shield size={20} color="#0ea5e9" />,
              title: 'Risk Assessment',
              desc: 'Smart risk scoring to evaluate every trade before you act.',
              status: 'soon',
            },
            {
              color: '#ec4899', iconBg: '#fce7f3',
              icon: <Clock size={20} color="#ec4899" />,
              title: 'Signal History',
              desc: 'Review all past signals with accuracy tracking over time.',
              status: 'soon',
            },
          ].map((f, i) => (
            <div key={i} style={{
              background: '#fff', border: '1px solid #e2e8f0',
              borderRadius: '14px', padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              position: 'relative',
            }}>
              <span style={{
                position: 'absolute', top: '14px', right: '14px',
                background: f.status === 'live' ? '#d1fae5' : '#f1f5f9',
                color:      f.status === 'live' ? '#059669' : '#94a3b8',
                fontSize: '10px', fontWeight: '700',
                borderRadius: '6px', padding: '2px 8px', letterSpacing: '0.5px',
              }}>
                {f.status === 'live' ? 'LIVE' : 'SOON'}
              </span>
              <div style={{ width: '42px', height: '42px', background: f.iconBg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                {f.icon}
              </div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>{f.title}</div>
              <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>

      </main>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}