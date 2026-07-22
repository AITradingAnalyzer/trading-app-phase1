import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BarChart2,
  RefreshCw,
  Zap,
  AlertCircle,
  DollarSign,
  Newspaper,
} from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const BLOCKED_US_TICKERS = new Set([
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'NVDA', 'META',
  'NFLX', 'AMD', 'INTC', 'ORCL', 'IBM', 'UBER', 'LYFT', 'SNAP',
  'BAC', 'JPM', 'V', 'MA', 'XOM', 'CVX', 'DIS', 'WMT',
]);

const cardStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '16px',
  padding: '20px',
  boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
};

function badgeStyle(signal) {
  if (signal === 'BUY') {
    return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
  }
  if (signal === 'SELL') {
    return { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' };
  }
  return { bg: '#fef3c7', color: '#d97706', border: '#fde68a' };
}

function sentimentColor(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'bullish') return '#15803d';
  if (v === 'bearish') return '#dc2626';
  return '#d97706';
}

function formatINR(value) {
  if (value === null || value === undefined || value === '') return 'N/A';
  const num = Number(value);
  if (Number.isNaN(num)) return 'N/A';
  return `₹${num.toFixed(2)}`;
}

function formatConfidence(value) {
  if (value === null || value === undefined || value === '') return 'N/A';
  const num = Number(value);
  if (Number.isNaN(num)) return 'N/A';
  return `${num > 1 ? Math.round(num) : Math.round(num * 100)}%`;
}

function normalizeIndianTicker(input) {
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
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const loadMarketData = async () => {
    if (!API_URL) {
      setMarketError('VITE_API_URL is missing in Netlify environment variables.');
      return;
    }

    try {
      setMarketLoading(true);
      setMarketError('');
      const data = await fetchJSON(`${API_URL}/market-movers`);
      setMarketData(data);
    } catch (err) {
      setMarketError(err.message || 'Unable to load market movers.');
    } finally {
      setMarketLoading(false);
    }
  };

  useEffect(() => {
    loadMarketData();
  }, []);

  const handleAnalyze = async () => {
    const raw = normalizeIndianTicker(ticker);

    if (!raw) {
      setError('Please enter an Indian stock ticker like RELIANCE, TCS, INFY, HDFCBANK.');
      return;
    }

    if (BLOCKED_US_TICKERS.has(raw)) {
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

      const data = await fetchJSON(`${API_URL}/analyze/${encodeURIComponent(raw)}`);
      setAnalysis(data);
    } catch (err) {
      if (String(err.message).toLowerCase().includes('failed to fetch')) {
        setError('Frontend could not reach the backend. Check Railway deployment and VITE_API_URL.');
      } else {
        setError(err.message || 'Analyze failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const sentiment = marketData?.sentiment || {
    bullish: 0,
    neutral: 0,
    bearish: 0,
    overall: 'neutral',
  };

  const signalBadge = badgeStyle(analysis?.signal);

  return (
    <div
      style={{
        background: '#f8fafc',
        minHeight: '100vh',
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: isMobile ? '12px 16px' : '14px 28px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div
                style={{
                  width: isMobile ? '38px' : '40px',
                  height: isMobile ? '38px' : '40px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 14px rgba(16,185,129,0.25)',
                }}
              >
                <TrendingUp size={20} color="#fff" />
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '800', color: '#0f172a' }}>
                    Trading Companion
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>
                    by Waseem
                  </span>
                </div>
                {!isMobile && (
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    AI-Powered Indian Market Intelligence
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {!isMobile && (
                <div
                  style={{
                    background: '#fff7ed',
                    border: '1px solid #fed7aa',
                    borderRadius: '999px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    color: '#c2410c',
                    fontWeight: '700',
                  }}
                >
                  NSE / BSE
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#dcfce7',
                  border: '1px solid #bbf7d0',
                  borderRadius: '999px',
                  padding: '6px 12px',
                }}
              >
                <div
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#22c55e',
                  }}
                />
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#15803d' }}>LIVE</span>
              </div>
            </div>
          </div>
        </div>
      </header>

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
        {/* Analyze */}
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
            Enter an Indian stock ticker like <strong>RELIANCE</strong>, <strong>TCS</strong>, <strong>INFY</strong>, <strong>HDFCBANK</strong> and click <strong>Analyze</strong>.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              placeholder="RELIANCE · TCS · INFY · HDFCBANK · WIPRO"
              style={{
                flex: 1,
                minWidth: '220px',
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px 16px',
                fontSize: '15px',
                color: '#0f172a',
                outline: 'none',
                fontWeight: '600',
              }}
            />

            <button
              onClick={handleAnalyze}
              disabled={loading}
              style={{
                border: 'none',
                borderRadius: '12px',
                padding: isMobile ? '14px 18px' : '14px 24px',
                background: loading ? '#86efac' : 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: '800',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 6px 16px rgba(16,185,129,0.24)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              {loading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <TrendingUp size={16} />}
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>

          {error && (
            <div
              style={{
                marginTop: '16px',
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
              }}
            >
              <AlertCircle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#92400e' }}>Notice</div>
                <div style={{ fontSize: '13px', color: '#b45309', marginTop: '3px', lineHeight: 1.5 }}>
                  {error}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Analysis result */}
        {analysis && (
          <section style={{ marginBottom: '22px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                gap: '14px',
                marginBottom: '14px',
              }}
            >
              <div style={{ ...cardStyle, borderTop: '3px solid #0ea5e9' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Current Price
                </div>
                <div style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '800', color: '#0f172a' }}>
                  {formatINR(analysis.current_price)}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  {analysis.company_name || analysis.ticker}
                </div>
              </div>

              <div style={{ ...cardStyle, borderTop: `3px solid ${signalBadge.color}`, background: signalBadge.bg }}>
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
                        {item.title}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {item.source} · {item.published_at}
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

        {/* Dynamic movers */}
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
              {marketLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {marketError && (
            <div
              style={{
                marginBottom: '14px',
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '13px',
                color: '#b45309',
              }}
            >
              {marketError}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '20px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <TrendingUp size={17} color="#16a34a" />
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Top 5 Gainers</span>
              </div>

              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {marketData.top_gainers.map((item, index) => (
                  <li key={index} style={{ marginBottom: '12px', color: '#0f172a' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700' }}>
                      {item.ticker} <span style={{ color: '#16a34a' }}>({item.change_pct > 0 ? '+' : ''}{item.change_pct}%)</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                      {item.name} · {formatINR(item.price)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <TrendingDown size={17} color="#dc2626" />
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Top 5 Losers</span>
              </div>

              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {marketData.top_losers.map((item, index) => (
                  <li key={index} style={{ marginBottom: '12px', color: '#0f172a' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700' }}>
                      {item.ticker} <span style={{ color: '#dc2626' }}>({item.change_pct}%)</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                      {item.name} · {formatINR(item.price)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Dynamic sentiment */}
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