import { useEffect, useMemo, useState } from 'react';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  BarChart2,
  Newspaper,
  Search,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

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
  const [ticker, setTicker] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState('');
  const [marketData, setMarketData] = useState({
    top_gainers: [],
    top_losers: [],
    sentiment: { bullish: 0, neutral: 0, bearish: 0, overall: 'neutral' },
    last_updated: '',
  });

  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const cardStyle = useMemo(
    () => ({
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: isMobile ? '16px' : '18px',
      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
    }),
    [isMobile]
  );

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
        top_losers: Array.isArray(data?.top_losers) ? data.top_losers : [],
        sentiment: data?.sentiment || { bullish: 0, neutral: 0, bearish: 0, overall: 'neutral' },
        last_updated: data?.last_updated || '',
      });
    } catch (err) {
      setMarketError(err.message || 'Unable to load market movers.');
    } finally {
      setMarketLoading(false);
    }
  };

  useEffect(() => {
    loadMarketData();
  }, []);

  useEffect(() => {
    if (!API_URL) return;

    const q = ticker.trim();
    if (!q || q.length < 1) {
      setSuggestions([]);
      setSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const data = await fetchJSON(`${API_URL}/search?q=${encodeURIComponent(q)}`, 10000);
        setSuggestions(Array.isArray(data?.results) ? data.results : []);
      } catch {
        setSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [ticker]);

  const handleAnalyze = async (forcedTicker) => {
    const input = normalizeTicker(forcedTicker || ticker);
    if (!input) {
      setError('Please enter a valid Indian stock ticker.');
      return;
    }

    if (!API_URL) {
      setError('VITE_API_URL is missing in Netlify environment variables.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setShowSuggestions(false);

      const data = await fetchJSON(`${API_URL}/analyze/${encodeURIComponent(input)}`, 25000);
      setAnalysis(data);
    } catch (err) {
      setAnalysis(null);
      setError(err.message || 'Analysis failed.');
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

  const signalBadge = useMemo(() => {
    const signal = (analysis?.signal || '').toUpperCase();
    if (signal === 'BUY') {
      return { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
    }
    if (signal === 'SELL') {
      return { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
    }
    return { color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
  }, [analysis]);

  const sentiment = marketData?.sentiment || {
    bullish: 0,
    neutral: 0,
    bearish: 0,
    overall: 'neutral',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: isMobile ? '14px 16px' : '16px 28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
              AI Fiesta Trader
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              Indian Stock Analysis Dashboard
            </div>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '999px',
              padding: '6px 12px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#22c55e',
              }}
            />
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#15803d' }}>LIVE</span>
          </div>
        </div>
      </header>

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
        <section style={{ ...cardStyle, marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <Zap size={18} color="#059669" />
            <span style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
              Analyze an Indian Stock
            </span>
            <span
              style={{
                fontSize: '11px',
                color: '#c2410c',
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                padding: '3px 8px',
                borderRadius: '999px',
                fontWeight: '700',
              }}
            >
              NSE / BSE Only
            </span>
          </div>

          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 18px', lineHeight: 1.6 }}>
            Search by stock code or company name like <strong>RELIANCE</strong>, <strong>Reliance Industries</strong>, <strong>TCS</strong>, <strong>INFY</strong>, <strong>HDFC Bank</strong>.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <Search
                  size={16}
                  color="#94a3b8"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '14px',
                    transform: 'translateY(-50%)',
                  }}
                />
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => {
                    setTicker(e.target.value.toUpperCase());
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 150);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  placeholder="RELIANCE · TCS · INFY · HDFCBANK · WIPRO"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '13px 14px 13px 40px',
                    fontSize: '14px',
                    color: '#0f172a',
                    outline: 'none',
                  }}
                />
              </div>

              {showSuggestions && (ticker.trim() || suggestions.length > 0) && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.10)',
                    overflow: 'hidden',
                    zIndex: 30,
                  }}
                >
                  {searchLoading ? (
                    <div style={{ padding: '12px 14px', fontSize: '13px', color: '#64748b' }}>
                      Searching...
                    </div>
                  ) : suggestions.length > 0 ? (
                    suggestions.slice(0, 5).map((item, idx) => (
                      <button
                        key={`${item.ticker}-${idx}`}
                        type="button"
                        onMouseDown={() => handleSuggestionSelect(item)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          border: 'none',
                          background: '#ffffff',
                          padding: '12px 14px',
                          cursor: 'pointer',
                          borderBottom: idx !== suggestions.slice(0, 5).length - 1 ? '1px solid #f1f5f9' : 'none',
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                          {item.ticker}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          {item.name}
                        </div>
                      </button>
                    ))
                  ) : ticker.trim() ? (
                    <div style={{ padding: '12px 14px', fontSize: '13px', color: '#64748b' }}>
                      No matching stocks found.
                    </div>
                  ) : null}
                </div>
              )}
            </div>

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
                boxShadow: '0 8px 20px rgba(15,118,110,0.18)',
              }}
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>

          {error ? (
            <div
              style={{
                marginTop: '14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                borderRadius: '12px',
                padding: '12px 14px',
                fontSize: '13px',
                fontWeight: '600',
              }}
            >
              {error}
            </div>
          ) : null}
        </section>

        {analysis && (
          <section style={{ marginBottom: '22px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
                gap: '14px',
                marginBottom: '14px',
              }}
            >
              <div style={{ ...cardStyle, borderTop: '3px solid #0f766e' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Current Price
                </div>
                <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '900', color: '#0f172a' }}>
                  ₹{analysis.current_price ?? '—'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  {analysis.company_name || analysis.ticker}
                </div>
              </div>

              <div
                style={{
                  ...cardStyle,
                  borderTop: `3px solid ${signalBadge.color}`,
                  background: signalBadge.bg,
                  borderColor: signalBadge.border,
                }}
              >
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>
                  AI Signal
                </div>
                <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '900', color: signalBadge.color }}>
                  {analysis.signal || 'N/A'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  {analysis.ticker}
                </div>
              </div>

              <div style={{ ...cardStyle, borderTop: '3px solid #6366f1' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Confidence
                </div>
                <div style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '800', color: '#4338ca' }}>
                  {formatConfidence(analysis.confidence)}
                </div>
              </div>

              <div style={{ ...cardStyle, borderTop: `3px solid ${sentimentColor(analysis.sentiment)}` }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>
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
                <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.7 }}>
                  {analysis.reasoning || 'No reasoning available.'}
                </div>
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: '11px', color: '#059669', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Key Drivers
                </div>
                <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.7 }}>
                  {analysis.key_drivers || 'No drivers available.'}
                </div>
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Risk Factors
                </div>
                <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.7 }}>
                  {analysis.risk_factors || 'No risks available.'}
                </div>
              </div>
            </div>

            <div style={{ ...cardStyle, marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <BarChart2 size={17} color="#0f766e" />
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                  Justification & Suggested Timeframe
                </span>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px',
                  marginBottom: '12px',
                }}
              >
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Suggested Action Window
                </div>
                <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: '700', lineHeight: 1.6 }}>
                  {analysis.timeframe || 'No timeframe available.'}
                </div>
              </div>

              {Array.isArray(analysis.justification) && analysis.justification.length > 0 ? (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px' }}>
                    On what basis is this signal generated?
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', color: '#334155' }}>
                    {analysis.justification.map((point, index) => (
                      <li key={index} style={{ marginBottom: '9px', fontSize: '13px', lineHeight: 1.7 }}>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  No justification points available.
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Newspaper size={17} color="#f59e0b" />
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
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
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '14px',
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', lineHeight: 1.6, marginBottom: '8px' }}>
                        {typeof item.title === 'string' ? item.title : 'Market Update'}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {typeof item.source === 'string' ? item.source : 'News'} · {item.published_at}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            color: sentimentColor(item.sentiment),
                            textTransform: 'capitalize',
                          }}
                        >
                          {item.sentiment}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  No recent news available for this stock right now.
                </div>
              )}
            </div>
          </section>
        )}

        <section style={{ ...cardStyle, marginBottom: '22px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '16px',
            }}
          >
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                Top 5 Gainers & Top 5 Losers
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                Live Indian market movers
                {marketData?.last_updated ? ` · Last updated: ${marketData.last_updated}` : ''}
              </div>
            </div>

            <button
              onClick={loadMarketData}
              disabled={marketLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                borderRadius: '10px',
                padding: '9px 14px',
                cursor: marketLoading ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: '700',
                color: '#334155',
              }}
            >
              <RefreshCw size={14} style={{ animation: marketLoading ? 'spin 1s linear infinite' : 'none' }} />
              {marketLoading ? 'Updating...' : 'Refresh'}
            </button>
          </div>

          {marketError ? (
            <div
              style={{
                marginBottom: '14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                borderRadius: '12px',
                padding: '12px 14px',
                fontSize: '13px',
                fontWeight: '600',
              }}
            >
              {marketError}
            </div>
          ) : null}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: '14px',
            }}
          >
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '14px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <TrendingUp size={17} color="#16a34a" />
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#166534' }}>
                  Top 5 Gainers
                </span>
              </div>

              {Array.isArray(marketData.top_gainers) && marketData.top_gainers.length > 0 ? (
                marketData.top_gainers.map((item, idx) => (
                  <div
                    key={`${item.ticker}-${idx}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '10px',
                      padding: '10px 0',
                      borderBottom: idx !== marketData.top_gainers.length - 1 ? '1px solid #dcfce7' : 'none',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#14532d' }}>
                        {item.ticker}
                      </div>
                      <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>
                        {item.name}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#14532d' }}>
                        ₹{item.price}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#16a34a' }}>
                        {item.change_pct > 0 ? '+' : ''}
                        {item.change_pct}%
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '13px', color: '#64748b' }}>No gainers data available.</div>
              )}
            </div>

            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '14px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <TrendingDown size={17} color="#dc2626" />
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#991b1b' }}>
                  Top 5 Losers
                </span>
              </div>

              {Array.isArray(marketData.top_losers) && marketData.top_losers.length > 0 ? (
                marketData.top_losers.map((item, idx) => (
                  <div
                    key={`${item.ticker}-${idx}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '10px',
                      padding: '10px 0',
                      borderBottom: idx !== marketData.top_losers.length - 1 ? '1px solid #fee2e2' : 'none',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#7f1d1d' }}>
                        {item.ticker}
                      </div>
                      <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>
                        {item.name}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#7f1d1d' }}>
                        ₹{item.price}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626' }}>
                        {item.change_pct}%
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '13px', color: '#64748b' }}>No losers data available.</div>
              )}
            </div>
          </div>
        </section>

        <section style={cardStyle}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={17} color="#6366f1" />
              <span style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                Indian Market Sentiment
              </span>
            </div>

            <button
              onClick={loadMarketData}
              disabled={marketLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                borderRadius: '10px',
                padding: '9px 14px',
                cursor: marketLoading ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: '700',
                color: '#334155',
              }}
            >
              <RefreshCw size={14} style={{ animation: marketLoading ? 'spin 1s linear infinite' : 'none' }} />
              {marketLoading ? 'Updating...' : 'Refresh'}
            </button>
          </div>

          {[
            { label: 'Bullish', value: sentiment.bullish, color: '#16a34a' },
            { label: 'Neutral', value: sentiment.neutral, color: '#d97706' },
            { label: 'Bearish', value: sentiment.bearish, color: '#dc2626' },
          ].map((row, i) => (
            <div key={i} style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                <span style={{ fontSize: '14px', color: '#334155', fontWeight: '600' }}>{row.label}</span>
                <span style={{ fontSize: '14px', color: row.color, fontWeight: '800' }}>{row.value}%</span>
              </div>
              <div style={{ height: '10px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${row.value}%`,
                    height: '100%',
                    background: row.color,
                    borderRadius: '999px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          ))}

          <div
            style={{
              marginTop: '6px',
              background:
                sentiment.overall === 'bullish'
                  ? '#dcfce7'
                  : sentiment.overall === 'bearish'
                  ? '#fee2e2'
                  : '#fef3c7',
              border:
                sentiment.overall === 'bullish'
                  ? '1px solid #bbf7d0'
                  : sentiment.overall === 'bearish'
                  ? '1px solid #fecaca'
                  : '1px solid #fde68a',
              borderRadius: '12px',
              padding: '14px 16px',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: '800',
                color: sentimentColor(sentiment.overall),
                textTransform: 'capitalize',
                marginBottom: '4px',
              }}
            >
              Overall Market Mood: {sentiment.overall}
            </div>
            <div style={{ fontSize: '12px', color: '#475569' }}>
              This updates from the latest live top movers data when you press refresh.
            </div>
          </div>
        </section>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}