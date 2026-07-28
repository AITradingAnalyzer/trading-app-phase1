import { useEffect, useMemo, useState } from 'react';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  BarChart2,
  Newspaper,
  Search,
  Moon,
  Sun,
  Star,
  X,
} from 'lucide-react';
import Watchlist from '../components/Watchlist';
import { useDarkMode } from '../context/DarkModeContext.jsx';

const API_URL = import.meta.env.VITE_API_URL || '';

const BLOCKED_US_TICKERS = new Set([
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'NVDA', 'META',
  'NFLX', 'AMD', 'INTC', 'ORCL', 'IBM', 'UBER', 'LYFT', 'SNAP',
  'BAC', 'JPM', 'V', 'MA', 'XOM', 'CVX', 'DIS', 'WMT',
]);

function sentimentColor(s) {
  if (!s) return '#64748b';
  const val = typeof s === 'string' ? s.toLowerCase() : 'neutral';
  if (val === 'bullish' || val === 'positive' || val === 'buy') return '#16a34a';
  if (val === 'bearish' || val === 'negative' || val === 'sell') return '#dc2626';
  return '#d97706';
}

function formatConfidence(val) {
  if (val == null) return '—';
  const n = Number(val);
  if (Number.isNaN(n)) return '—';
  return n >= 1 ? `${n.toFixed(0)}%` : `${(n * 100).toFixed(0)}%`;
}

function normalizeTicker(input) {
  if (!input) return '';
  const cleaned = input.trim().toUpperCase().replace(/\s/g, '');
  if (!cleaned) return '';
  if (cleaned.endsWith('.NS') || cleaned.endsWith('.BO')) return cleaned;
  return cleaned;
}

async function fetchJSON(url, timeout = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      let message = `Server returned ${res.status}`;
      try {
        const data = await res.json();
        if (data?.detail) message = data.detail;
      } catch {
        // ignore
      }
      throw new Error(message);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export default function Home() {
  const { isDark, toggleDarkMode } = useDarkMode();

  const [ticker, setTicker]         = useState('');
  const [analysis, setAnalysis]     = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError]     = useState('');
  const [marketData, setMarketData]       = useState({
    top_gainers: [],
    top_losers: [],
    sentiment: { bullish: 0, neutral: 0, bearish: 0, overall: 'neutral' },
    last_updated: '',
  });

  const [suggestions, setSuggestions]       = useState([]);
  const [searchLoading, setSearchLoading]   = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showWatchlist, setShowWatchlist]   = useState(false);

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── cardStyle reacts to isDark ──────────────────────────────────
  const cardStyle = useMemo(
    () => ({
      background: isDark ? '#1e293b' : '#ffffff',
      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      borderRadius: '16px',
      padding: isMobile ? '16px' : '18px',
      boxShadow: isDark
        ? '0 8px 24px rgba(0,0,0,0.35)'
        : '0 8px 24px rgba(15,23,42,0.04)',
    }),
    [isMobile, isDark]
  );

  // ── signalBadge reacts to isDark ────────────────────────────────
  const signalBadge = useMemo(() => {
    const signal = (analysis?.signal || '').toUpperCase();
    if (signal === 'BUY')
      return {
        color: '#16a34a',
        bg: isDark ? 'rgba(22,163,74,0.15)' : '#f0fdf4',
        border: '#bbf7d0',
      };
    if (signal === 'SELL')
      return {
        color: '#dc2626',
        bg: isDark ? 'rgba(220,38,38,0.15)' : '#fef2f2',
        border: '#fecaca',
      };
    return {
      color: '#d97706',
      bg: isDark ? 'rgba(217,119,6,0.15)' : '#fffbeb',
      border: '#fde68a',
    };
  }, [analysis, isDark]);

  // ── Market Data ─────────────────────────────────────────────────
  const loadMarketData = async () => {
    if (!API_URL) {
      setMarketError('VITE_API_URL is missing in Netlify environment variables.');
      return;
    }
    try {
      setMarketLoading(true);
      setMarketError('');
      const data = await fetchJSON(`${API_URL}/market-movers`);
      setMarketData({
        top_gainers: Array.isArray(data?.top_gainers) ? data.top_gainers : [],
        top_losers:  Array.isArray(data?.top_losers)  ? data.top_losers  : [],
        sentiment:   data?.sentiment || { bullish: 0, neutral: 0, bearish: 0, overall: 'neutral' },
        last_updated: data?.last_updated || '',
      });
    } catch (err) {
      setMarketError(err.message || 'Unable to load market movers.');
    } finally {
      setMarketLoading(false);
    }
  };

  useEffect(() => { loadMarketData(); }, []);

  // ── Search suggestions debounce ─────────────────────────────────
  useEffect(() => {
    if (!API_URL) return;
    const q = ticker.trim();
    if (!q || q.length < 1) { setSuggestions([]); setSearchLoading(false); return; }

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const data = await fetchJSON(`${API_URL}/search?q=${encodeURIComponent(q)}`, 10000);
        setSuggestions(Array.isArray(data?.results) ? data.results : []);
      } catch { setSuggestions([]); }
      finally { setSearchLoading(false); }
    }, 250);

    return () => clearTimeout(timer);
  }, [ticker]);

  // ── Analyze ─────────────────────────────────────────────────────
  const handleAnalyze = async (forcedTicker) => {
    const input = normalizeTicker(forcedTicker || ticker);
    if (!input) { setError('Please enter a valid Indian stock ticker.'); return; }

    if (BLOCKED_US_TICKERS.has(input)) {
      setError('Kindly search Indian stocks only.');
      setAnalysis(null);
      return;
    }

    if (!API_URL) {
      setError('VITE_API_URL is missing. Add your Railway backend URL in Netlify environment variables.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setAnalysis(null);
      setShowSuggestions(false);
      const data = await fetchJSON(`${API_URL}/analyze/${encodeURIComponent(input)}`, 25000);
      setAnalysis(data);
    } catch (err) {
      setAnalysis(null);
      setError(
        String(err.message).toLowerCase().includes('failed to fetch')
          ? 'Frontend could not reach the backend. Check Railway deployment and VITE_API_URL.'
          : err.message || 'Analysis failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionSelect = (item) => {
    setTicker(item?.ticker || '');
    setSuggestions([]);
    setShowSuggestions(false);
    handleAnalyze(item?.ticker || '');
  };

  const sentiment = marketData?.sentiment || {
    bullish: 0, neutral: 0, bearish: 0, overall: 'neutral',
  };

  // ── Colour helpers ───────────────────────────────────────────────
  const txt    = isDark ? '#f1f5f9' : '#0f172a';
  const subTxt = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#334155' : '#e2e8f0';

  // ════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        background: isDark ? '#0f172a' : '#f8fafc',
        minHeight: '100vh',
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        color: txt,
      }}
    >
      {/* ── HEADER ──────────────────────────────────────────────── */}
      <header
        style={{
          background: isDark ? '#1e293b' : '#ffffff',
          borderBottom: `1px solid ${border}`,
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: isMobile ? '14px 16px' : '16px 28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px', lineHeight: 1 }}>🏛️</span>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: txt, margin: 0 }}>
              Trading Companion
              <span style={{ fontSize: '14px', fontWeight: '400', color: subTxt, marginLeft: '6px' }}>
                by Waseem
              </span>
            </h1>
          </div>

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* LIVE badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: isDark ? 'rgba(34,197,94,0.1)' : '#f0fdf4',
                border: `1px solid ${isDark ? 'rgba(34,197,94,0.3)' : '#bbf7d0'}`,
                borderRadius: '999px',
                padding: '6px 12px',
              }}
            >
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#15803d' }}>LIVE</span>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              title={isDark ? 'Light mode' : 'Dark mode'}
              style={{
                background: isDark ? '#334155' : '#f1f5f9',
                border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
                borderRadius: '10px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: isDark ? '#fbbf24' : '#475569',
              }}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Mobile Watchlist Toggle */}
            {isMobile && (
              <button
                onClick={() => setShowWatchlist(!showWatchlist)}
                title="Watchlist"
                style={{
                  background: isDark ? '#334155' : '#f1f5f9',
                  border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
                  borderRadius: '10px',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: isDark ? '#94a3b8' : '#475569',
                }}
              >
                {showWatchlist ? <X size={18} /> : <Star size={18} />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── BODY: Sidebar + Main ─────────────────────────────────── */}
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 65px)' }}>

        {/* Watchlist Sidebar */}
        <div
          style={{
            display: isMobile && !showWatchlist ? 'none' : 'flex',
            width: isMobile ? '100%' : '270px',
            flexShrink: 0,
            borderRight: `1px solid ${border}`,
            position: isMobile ? 'fixed' : 'sticky',
            top: isMobile ? 0 : '65px',
            left: 0,
            height: isMobile ? '100vh' : 'calc(100vh - 65px)',
            zIndex: isMobile ? 100 : 10,
            overflowY: 'auto',
            flexDirection: 'column',
          }}
        >
          <Watchlist
            onSelectStock={(selected) => {
              setTicker(selected);
              handleAnalyze(selected);
              if (isMobile) setShowWatchlist(false);
            }}
            currentTicker={ticker}
            isDark={isDark}
          />
        </div>

        {/* ── MAIN CONTENT ──────────────────────────────────────── */}
        <div style={{ flex: 1, overflowX: 'hidden' }}>

          {/* Hero */}
          <section
            style={{
              background: 'linear-gradient(135deg, #065f46 0%, #0f766e 100%)',
              color: '#ffffff',
              padding: isMobile ? '34px 18px' : '52px 28px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '999px',
                padding: '6px 14px',
                marginBottom: '18px',
                fontSize: '12px',
                fontWeight: '700',
                color: '#bbf7d0',
              }}
            >
              <Zap size={13} />
              Indian Stocks Only
            </div>

            <h1 style={{ fontSize: isMobile ? '28px' : '40px', fontWeight: '800', margin: '0 0 10px' }}>
              Smarter Trading Decisions
            </h1>
            <p
              style={{
                margin: '0 auto',
                maxWidth: '640px',
                fontSize: '15px',
                lineHeight: 1.7,
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              Analyze Indian stocks, check live top gainers and losers, and track market sentiment in a clean and simple UI.
            </p>
          </section>

          <main
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: isMobile ? '18px 14px 40px' : '28px 28px 40px',
            }}
          >
            {/* ── ANALYZE SECTION ──────────────────────────────── */}
            <section style={{ ...cardStyle, marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <Zap size={18} color="#059669" />
                <span style={{ fontSize: '17px', fontWeight: '800', color: txt }}>
                  Analyze an Indian Stock
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#c2410c',
                    background: isDark ? 'rgba(194,65,12,0.15)' : '#fff7ed',
                    border: '1px solid #fed7aa',
                    padding: '3px 8px',
                    borderRadius: '999px',
                    fontWeight: '700',
                  }}
                >
                  NSE / BSE Only
                </span>
              </div>

              <p style={{ fontSize: '13px', color: subTxt, margin: '0 0 18px', lineHeight: 1.6 }}>
                Enter an Indian stock ticker like <strong>RELIANCE</strong>, <strong>TCS</strong>,{' '}
                <strong>INFY</strong>, <strong>HDFCBANK</strong> and click <strong>Analyze</strong>.
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {/* Input + suggestions */}
                <div style={{ flex: 1, position: 'relative', minWidth: '220px' }}>
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: subTxt,
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    type="text"
                    value={ticker}
                    onChange={(e) => {
                      setTicker(e.target.value.toUpperCase());
                      setShowSuggestions(true);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="RELIANCE · TCS · INFY · HDFCBANK · WIPRO"
                    style={{
                      width: '100%',
                      paddingLeft: '40px',
                      paddingRight: '14px',
                      paddingTop: '13px',
                      paddingBottom: '13px',
                      background: isDark ? '#0f172a' : '#f8fafc',
                      border: `1.5px solid ${border}`,
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: txt,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />

                  {/* Suggestions dropdown */}
                  {showSuggestions && (suggestions.length > 0 || searchLoading) && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        right: 0,
                        background: isDark ? '#1e293b' : '#ffffff',
                        border: `1px solid ${border}`,
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        zIndex: 100,
                        overflow: 'hidden',
                      }}
                    >
                      {searchLoading ? (
                        <div style={{ padding: '12px 14px', fontSize: '13px', color: subTxt }}>
                          Searching...
                        </div>
                      ) : suggestions.length > 0 ? (
                        suggestions.map((item, i) => (
                          <button
                            key={i}
                            onMouseDown={() => handleSuggestionSelect(item)}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              background: 'transparent',
                              border: 'none',
                              borderBottom:
                                i < suggestions.length - 1
                                  ? `1px solid ${isDark ? '#334155' : '#f1f5f9'}`
                                  : 'none',
                              cursor: 'pointer',
                              textAlign: 'left',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = isDark ? '#0f172a' : '#f8fafc')
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = 'transparent')
                            }
                          >
                            <div style={{ fontSize: '13px', fontWeight: '800', color: txt }}>
                              {item.ticker}
                            </div>
                            <div style={{ fontSize: '12px', color: subTxt, marginTop: '2px' }}>
                              {item.name}
                            </div>
                          </button>
                        ))
                      ) : ticker.trim() ? (
                        <div style={{ padding: '12px 14px', fontSize: '13px', color: subTxt }}>
                          No matching stocks found.
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Analyze Button */}
                <button
                  onClick={() => handleAnalyze()}
                  disabled={loading}
                  style={{
                    border: 'none',
                    background: loading ? '#94a3b8' : '#0f766e',
                    color: '#ffffff',
                    borderRadius: '12px',
                    padding: '13px 18px',
                    minWidth: isMobile ? '100%' : '130px',
                    fontSize: '14px',
                    fontWeight: '800',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: loading ? 'none' : '0 8px 20px rgba(15,118,110,0.18)',
                  }}
                >
                  {loading ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>

              {error && (
                <div
                  style={{
                    marginTop: '14px',
                    background: isDark ? 'rgba(185,28,28,0.15)' : '#fef2f2',
                    border: `1px solid ${isDark ? '#991b1b' : '#fecaca'}`,
                    color: isDark ? '#fca5a5' : '#b91c1c',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    fontSize: '13px',
                    fontWeight: '600',
                  }}
                >
                  {error}
                </div>
              )}
            </section>

            {/* ── ANALYSIS RESULTS ─────────────────────────────── */}
            {analysis && (
              <section style={{ marginBottom: '22px' }}>

                {/* 4 stat cards */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
                    gap: '14px',
                    marginBottom: '14px',
                  }}
                >
                  {/* Current Price */}
                  <div style={{ ...cardStyle, borderTop: '3px solid #0f766e' }}>
                    <div style={{ fontSize: '11px', color: subTxt, fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Current Price
                    </div>
                    <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '900', color: txt }}>
                      ₹{analysis.current_price ?? '—'}
                    </div>
                    <div style={{ fontSize: '12px', color: subTxt, marginTop: '4px' }}>
                      {analysis.company_name || analysis.ticker}
                    </div>
                  </div>

                  {/* AI Signal */}
                  <div
                    style={{
                      ...cardStyle,
                      borderTop: `3px solid ${signalBadge.color}`,
                      background: signalBadge.bg,
                    }}
                  >
                    <div style={{ fontSize: '11px', color: subTxt, fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>
                      AI Signal
                    </div>
                    <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '900', color: signalBadge.color }}>
                      {analysis.signal || 'N/A'}
                    </div>
                    <div style={{ fontSize: '12px', color: subTxt, marginTop: '4px' }}>
                      {analysis.ticker}
                    </div>
                  </div>

                  {/* Confidence */}
                  <div style={{ ...cardStyle, borderTop: '3px solid #6366f1' }}>
                    <div style={{ fontSize: '11px', color: subTxt, fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Confidence
                    </div>
                    <div style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '800', color: '#4338ca' }}>
                      {formatConfidence(analysis.confidence)}
                    </div>
                  </div>

                  {/* Sentiment */}
                  <div style={{ ...cardStyle, borderTop: `3px solid ${sentimentColor(analysis.sentiment)}` }}>
                    <div style={{ fontSize: '11px', color: subTxt, fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Sentiment
                    </div>
                    <div
                      style={{
                        fontSize: isMobile ? '18px' : '24px',
                        fontWeight: '800',
                        color: sentimentColor(analysis.sentiment),
                        textTransform: 'capitalize',
                      }}
                    >
                      {analysis.sentiment || 'neutral'}
                    </div>
                  </div>
                </div>

                {/* 3-column: Reasoning / Key Drivers / Risk Factors */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                    gap: '14px',
                    marginBottom: '14px',
                  }}
                >
                  <div style={cardStyle}>
                    <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>
                      AI Reasoning
                    </div>
                    <div style={{ fontSize: '13px', color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.6 }}>
                      {analysis.reasoning || 'No reasoning available.'}
                    </div>
                  </div>

                  <div style={cardStyle}>
                    <div style={{ fontSize: '11px', color: '#059669', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Key Drivers
                    </div>
                    {Array.isArray(analysis.key_drivers) && analysis.key_drivers.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '16px' }}>
                        {analysis.key_drivers.map((d, i) => (
                          <li key={i} style={{ fontSize: '13px', color: isDark ? '#cbd5e1' : '#334155', marginBottom: '4px', lineHeight: 1.5 }}>
                            {d}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ fontSize: '13px', color: subTxt }}>No key drivers available.</div>
                    )}
                  </div>

                  <div style={cardStyle}>
                    <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Risk Factors
                    </div>
                    {Array.isArray(analysis.risk_factors) && analysis.risk_factors.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '16px' }}>
                        {analysis.risk_factors.map((r, i) => (
                          <li key={i} style={{ fontSize: '13px', color: isDark ? '#cbd5e1' : '#334155', marginBottom: '4px', lineHeight: 1.5 }}>
                            {r}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ fontSize: '13px', color: subTxt }}>No risk factors available.</div>
                    )}
                  </div>
                </div>

                {/* Technical Indicators: Prev Close / SMA20 / SMA50 / RSI */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
                    gap: '14px',
                    marginBottom: '14px',
                  }}
                >
                  {[
                    { label: 'Prev Close', value: analysis.previous_close != null ? `₹${analysis.previous_close}` : '—', color: '#0f766e' },
                    { label: 'SMA 20',     value: analysis.sma20 != null ? `₹${Number(analysis.sma20).toFixed(2)}` : '—', color: '#6366f1' },
                    { label: 'SMA 50',     value: analysis.sma50 != null ? `₹${Number(analysis.sma50).toFixed(2)}` : '—', color: '#8b5cf6' },
                    {
                      label: 'RSI',
                      value: analysis.rsi != null ? Number(analysis.rsi).toFixed(1) : '—',
                      color: analysis.rsi > 70 ? '#dc2626' : analysis.rsi < 30 ? '#16a34a' : '#d97706',
                    },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ ...cardStyle, borderTop: `3px solid ${color}` }}>
                      <div style={{ fontSize: '11px', color: subTxt, fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>
                        {label}
                      </div>
                      <div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '800', color }}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Day Change */}
                {analysis.change_pct != null && (
                  <div style={{ ...cardStyle, marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', color: subTxt, fontWeight: '600' }}>Day Change:</span>
                      <span style={{ fontSize: '18px', fontWeight: '800', color: analysis.change_pct >= 0 ? '#16a34a' : '#dc2626' }}>
                        {analysis.change_pct >= 0 ? '+' : ''}{Number(analysis.change_pct).toFixed(2)}%
                      </span>
                      {analysis.change_pct >= 0
                        ? <TrendingUp size={20} color="#16a34a" />
                        : <TrendingDown size={20} color="#dc2626" />}
                    </div>
                  </div>
                )}

                {/* News */}
                <div style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <Newspaper size={17} color="#f59e0b" />
                    <span style={{ fontSize: '16px', fontWeight: '800', color: txt }}>
                      Latest News — {analysis.ticker}
                    </span>
                  </div>

                  {Array.isArray(analysis.news) && analysis.news.length > 0 ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                        gap: '12px',
                      }}
                    >
                      {analysis.news.slice(0, 4).map((item, index) => (
                        <div
                          key={index}
                          style={{
                            background: isDark ? '#0f172a' : '#f8fafc',
                            border: `1px solid ${border}`,
                            borderRadius: '12px',
                            padding: '14px',
                          }}
                        >
                          <div style={{ fontSize: '13px', fontWeight: '700', color: txt, lineHeight: 1.6, marginBottom: '8px' }}>
                            {typeof item.title === 'string' ? item.title : 'Market Update'}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', color: subTxt }}>
                              {typeof item.source === 'string' ? item.source : 'News'} · {item.published_at}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: sentimentColor(item.sentiment), textTransform: 'capitalize' }}>
                              {item.sentiment}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: subTxt }}>
                      No recent news available for this stock right now.
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ── MARKET MOVERS ─────────────────────────────────── */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart2 size={18} color="#0f766e" />
                  <span style={{ fontSize: '17px', fontWeight: '800', color: txt }}>Market Movers</span>
                  {marketData.last_updated && (
                    <span style={{ fontSize: '11px', color: subTxt }}>· {marketData.last_updated}</span>
                  )}
                </div>
                <button
                  onClick={loadMarketData}
                  disabled={marketLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: isDark ? '#334155' : '#f1f5f9',
                    border: `1px solid ${border}`,
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: '700',
                    color: subTxt,
                    cursor: marketLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <RefreshCw size={14} />
                  {marketLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {marketError && (
                <div
                  style={{
                    marginBottom: '14px',
                    background: isDark ? 'rgba(185,28,28,0.15)' : '#fef2f2',
                    border: `1px solid ${isDark ? '#991b1b' : '#fecaca'}`,
                    color: isDark ? '#fca5a5' : '#b91c1c',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    fontSize: '13px',
                    fontWeight: '600',
                  }}
                >
                  {marketError}
                </div>
              )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                  gap: '14px',
                }}
              >
                {/* Top Gainers */}
                <div style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                    <TrendingUp size={16} color="#16a34a" />
                    <span style={{ fontSize: '14px', fontWeight: '800', color: txt }}>Top Gainers</span>
                  </div>
                  {marketLoading ? (
                    <div style={{ fontSize: '13px', color: subTxt }}>Loading...</div>
                  ) : marketData.top_gainers.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {marketData.top_gainers.map((item, i) => (
                        <div
                          key={i}
                          onClick={() => { setTicker(item.ticker?.replace('.NS','').replace('.BO','')); handleAnalyze(item.ticker); }}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 10px',
                            background: isDark ? 'rgba(22,163,74,0.08)' : '#f0fdf4',
                            borderRadius: '8px',
                            cursor: 'pointer',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: txt }}>
                              {item.ticker?.replace('.NS', '').replace('.BO', '')}
                            </div>
                            <div style={{ fontSize: '11px', color: subTxt }}>₹{item.price}</div>
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: '#16a34a' }}>
                            +{Number(item.change_pct).toFixed(2)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: subTxt }}>No data available.</div>
                  )}
                </div>

                {/* Top Losers */}
                <div style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                    <TrendingDown size={16} color="#dc2626" />
                    <span style={{ fontSize: '14px', fontWeight: '800', color: txt }}>Top Losers</span>
                  </div>
                  {marketLoading ? (
                    <div style={{ fontSize: '13px', color: subTxt }}>Loading...</div>
                  ) : marketData.top_losers.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {marketData.top_losers.map((item, i) => (
                        <div
                          key={i}
                          onClick={() => { setTicker(item.ticker?.replace('.NS','').replace('.BO','')); handleAnalyze(item.ticker); }}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 10px',
                            background: isDark ? 'rgba(220,38,38,0.08)' : '#fef2f2',
                            borderRadius: '8px',
                            cursor: 'pointer',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: txt }}>
                              {item.ticker?.replace('.NS', '').replace('.BO', '')}
                            </div>
                            <div style={{ fontSize: '11px', color: subTxt }}>₹{item.price}</div>
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: '#dc2626' }}>
                            {Number(item.change_pct).toFixed(2)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: subTxt }}>No data available.</div>
                  )}
                </div>

                {/* Market Sentiment */}
                <div style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                    <BarChart2 size={16} color="#6366f1" />
                    <span style={{ fontSize: '14px', fontWeight: '800', color: txt }}>Market Sentiment</span>
                  </div>

                  <div style={{ marginBottom: '14px', textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '20px',
                        fontWeight: '800',
                        color: sentimentColor(sentiment.overall),
                        textTransform: 'capitalize',
                      }}
                    >
                      {sentiment.overall || 'Neutral'}
                    </span>
                  </div>

                  {[
                    { label: 'Bullish', value: sentiment.bullish, color: '#16a34a' },
                    { label: 'Neutral', value: sentiment.neutral, color: '#d97706' },
                    { label: 'Bearish', value: sentiment.bearish, color: '#dc2626' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: subTxt, fontWeight: '600' }}>{label}</span>
                        <span style={{ fontSize: '12px', fontWeight: '800', color }}>{value}%</span>
                      </div>
                      <div style={{ background: isDark ? '#0f172a' : '#f1f5f9', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${value}%`,
                            background: color,
                            height: '100%',
                            borderRadius: '999px',
                            transition: 'width 0.5s ease',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
