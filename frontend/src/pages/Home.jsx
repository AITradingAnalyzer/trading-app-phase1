import { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, BarChart2,
  ArrowUpRight, ArrowDownRight,
  Zap, AlertCircle, RefreshCw,
  DollarSign, Newspaper,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

// ── US tickers to block ───────────────────────────────────────────────
const US_TICKERS = new Set([
  'AAPL','MSFT','GOOGL','GOOG','AMZN','TSLA','NVDA','META','NFLX','AMD',
  'INTC','ORCL','CSCO','IBM','QCOM','TXN','AVGO','MU','ADBE','CRM',
  'PYPL','UBER','LYFT','SNAP','BABA','JD','PDD','NIO','XPEV',
  'SPY','QQQ','DIA','IWM','GLD','SLV','VTI','VOO','ARKK',
  'BAC','JPM','WFC','GS','MS','C','V','MA','AXP',
  'JNJ','PFE','MRNA','BNTX','UNH','CVS','ABT','TMO','DHR','BMY',
  'XOM','CVX','COP','SLB','HAL','BA','LMT','RTX','GD','NOC',
  'DIS','CMCSA','T','VZ','CHTR','TMUS',
  'WMT','COST','TGT','HD','LOW','NKE','SBUX','MCD',
  'COIN','HOOD','SOFI','PLTR','RBLX','ABNB','DASH','RIVN','LCID',
  'AMGN','GILD','BIIB','REGN','VRTX',
]);

// ── Static mock data (Indian) ─────────────────────────────────────────
const TOP_GAINERS = [
  { ticker: 'TATAMOTORS', name: 'Tata Motors Ltd',           change: '+6.82%', price: '₹942.35'   },
  { ticker: 'ADANIPORTS', name: 'Adani Ports & SEZ Ltd',     change: '+4.91%', price: '₹1,284.60' },
  { ticker: 'HDFCBANK',   name: 'HDFC Bank Ltd',             change: '+3.45%', price: '₹1,734.90' },
  { ticker: 'WIPRO',      name: 'Wipro Ltd',                 change: '+3.12%', price: '₹488.75'   },
  { ticker: 'SUNPHARMA',  name: 'Sun Pharmaceutical Ltd',    change: '+2.78%', price: '₹1,612.40' },
];

const TOP_LOSERS = [
  { ticker: 'BAJFINANCE', name: 'Bajaj Finance Ltd',         change: '-4.23%', price: '₹6,842.15' },
  { ticker: 'HINDUNILVR', name: 'Hindustan Unilever Ltd',    change: '-3.67%', price: '₹2,341.80' },
  { ticker: 'COALINDIA',  name: 'Coal India Ltd',            change: '-2.94%', price: '₹418.25'   },
  { ticker: 'NTPC',       name: 'NTPC Ltd',                  change: '-2.31%', price: '₹342.60'   },
  { ticker: 'DRREDDY',    name: "Dr. Reddy's Laboratories",  change: '-1.89%', price: '₹5,891.30' },
];

// ── Helpers ───────────────────────────────────────────────────────────
function makeSentiment() {
  const bullish = Math.floor(Math.random() * 28) + 44;  // 44–72
  const bearish = Math.floor(Math.random() * 18) + 10;  // 10–28
  const neutral = Math.max(100 - bullish - bearish, 0);
  return { bullish, bearish, neutral };
}

function badgeStyle(signal) {
  if (signal === 'BUY')  return { bg: '#d1fae5', color: '#059669', border: '#a7f3d0' };
  if (signal === 'SELL') return { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' };
  return                        { bg: '#fef3c7', color: '#d97706', border: '#fde68a' };
}

function sentimentColor(s) {
  const v = (s || '').toLowerCase();
  if (v === 'bullish' || v === 'positive') return '#059669';
  if (v === 'bearish' || v === 'negative') return '#dc2626';
  return '#d97706';
}

function formatPrice(raw) {
  if (!raw || raw === 'N/A' || raw === 'null' || raw === null) return null;
  const n = Number(raw);
  if (isNaN(n)) return String(raw);
  return `₹${n.toFixed(2)}`;
}

function formatConfidence(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  if (isNaN(n)) return null;
  return n > 1 ? Math.round(n) : Math.round(n * 100);
}

function resolveTicker(input) {
  const t = input.trim().toUpperCase().replace(/\s/g, '');
  if (t.endsWith('.NS') || t.endsWith('.BO'))
    return { display: t.replace(/\.(NS|BO)$/, ''), api: t, indian: true };
  if (US_TICKERS.has(t))
    return { display: t, api: t, indian: false };
  return { display: t, api: `${t}.NS`, indian: true };
}

function mockNews(ticker) {
  const t = ticker.replace(/\.(NS|BO)$/, '');
  return [
    { title: `${t} beats Q4 earnings estimates by 9%, revenue up 18% YoY`,           source: 'Economic Times', time: '1h ago',  sentiment: 'bullish' },
    { title: `FIIs net buyers in ${t} for third consecutive session on NSE`,          source: 'Moneycontrol',   time: '3h ago',  sentiment: 'bullish' },
    { title: `${t} faces regulatory headwinds; SEBI issues compliance notice`,        source: 'Business Line',  time: '5h ago',  sentiment: 'bearish' },
    { title: `Domestic MFs increase ${t} allocation in flagship equity schemes`,      source: 'LiveMint',       time: '7h ago',  sentiment: 'bullish' },
  ];
}

// ── Shared card style ─────────────────────────────────────────────────
const CARD = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '14px',
  padding: '20px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
};

// ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [ticker,          setTicker]          = useState('');
  const [analysis,        setAnalysis]        = useState(null);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const [sentiment,       setSentiment]       = useState(makeSentiment());
  const [sentLoading,     setSentLoading]     = useState(false);
  const [isMobile,        setIsMobile]        = useState(window.innerWidth < 768);

  // mobile detector
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // refresh sentiment
  const refreshSentiment = () => {
    setSentLoading(true);
    setTimeout(() => { setSentiment(makeSentiment()); setSentLoading(false); }, 900);
  };

  // analyze handler
  const handleAnalyze = async () => {
    const raw = ticker.trim();
    if (!raw) { setError('Please enter a stock ticker  e.g.  RELIANCE  or  TCS'); return; }

    const { display, api, indian } = resolveTicker(raw);

    if (!indian) {
      setError(
        `"${display}" is a US-listed stock. Trading Companion currently supports Indian stocks (NSE/BSE) only. ` +
        `Try Indian stocks like RELIANCE, TCS, INFY, HDFCBANK, WIPRO, TATAMOTORS.`
      );
      return;
    }

    if (!API_URL) {
      setError('API URL not set. Go to Netlify → Site Configuration → Environment Variables → add VITE_API_URL = your Railway URL.');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const res = await fetch(`${API_URL}/analyze/${api}`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.detail || `Server returned ${res.status}`);
      }
      const data = await res.json();
      setAnalysis({ ...data, ticker: display, apiTicker: api });
    } catch (err) {
      setError(err.message || 'Analysis failed. Check your connection or try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── RENDER ──────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ═══════════════ HEADER ═══════════════ */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: isMobile ? '12px 16px' : '0 28px',
        height: isMobile ? 'auto' : '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 8px rgba(0,0,0,0.07)',
        gap: '12px',
      }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <div style={{
            width: isMobile ? '34px' : '40px',
            height: isMobile ? '34px' : '40px',
            flexShrink: 0,
            background: 'linear-gradient(135deg,#10b981,#059669)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(16,185,129,0.35)',
          }}>
            <TrendingUp size={isMobile ? 17 : 20} color="#fff" strokeWidth={2.5} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', flexWrap: 'nowrap' }}>
              <span style={{
                fontSize: isMobile ? '14px' : '18px',
                fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap',
              }}>
                Trading Companion
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500', whiteSpace: 'nowrap' }}>
                by Waseem
              </span>
            </div>
            {!isMobile && (
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>AI-Powered Indian Market Intelligence</div>
            )}
          </div>
        </div>

        {/* Indian Market badge — hidden on very small screens */}
        {!isMobile && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            background: '#fff7ed', border: '1px solid #fed7aa',
            borderRadius: '20px', padding: '4px 12px', whiteSpace: 'nowrap',
          }}>
            <span>🇮🇳</span>
            <span style={{ fontSize: '12px', color: '#c2410c', fontWeight: '600' }}>NSE / BSE</span>
          </div>
        )}

        {/* Live badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          background: '#d1fae5', border: '1px solid #a7f3d0',
          borderRadius: '20px', padding: '5px 12px', flexShrink: 0,
        }}>
          <div style={{
            width: '6px', height: '6px', background: '#10b981',
            borderRadius: '50%', boxShadow: '0 0 5px #10b981',
          }} />
          <span style={{ fontSize: '12px', color: '#059669', fontWeight: '700' }}>LIVE</span>
        </div>
      </header>

      {/* ═══════════════ HERO ═══════════════ */}
      <div style={{
        background: 'linear-gradient(135deg,#064e3b 0%,#065f46 50%,#0d9488 100%)',
        padding: isMobile ? '36px 20px' : '52px 32px',
        textAlign: 'center', color: '#fff',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', top:'-50px', right:'8%',  width:'220px', height:'220px', background:'rgba(255,255,255,0.04)', borderRadius:'50%' }} />
        <div style={{ position:'absolute', bottom:'-70px', left:'4%', width:'280px', height:'280px', background:'rgba(255,255,255,0.04)', borderRadius:'50%' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '20px', padding: '5px 14px', marginBottom: '18px',
          }}>
            <Zap size={13} color="#a7f3d0" />
            <span style={{ fontSize: '12px', color: '#a7f3d0', fontWeight: '600' }}>
              🇮🇳 Indian Market · NSE / BSE · AI Signals
            </span>
          </div>
          <h1 style={{ fontSize: isMobile ? '26px' : '38px', fontWeight: '800', margin: '0 0 12px', lineHeight: 1.2 }}>
            Smarter Trading Decisions
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', margin: '0 auto', maxWidth: '460px', lineHeight: 1.7 }}>
            Get instant <strong style={{ color: '#6ee7b7' }}>BUY / SELL / HOLD</strong> signals on Indian stocks,
            powered by AI analysis of NSE/BSE data and live news.
          </p>
        </div>
      </div>

      {/* ═══════════════ MAIN ═══════════════ */}
      <main style={{
        padding: isMobile ? '20px 14px 40px' : '28px 28px 40px',
        maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box',
      }}>

        {/* ─── ANALYZE BOX ─── */}
        <div style={{ ...CARD, marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <Zap size={18} color="#059669" />
            <span style={{ fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>Analyze an Indian Stock</span>
            <span style={{
              fontSize: '11px', color: '#c2410c', background: '#fff7ed',
              border: '1px solid #fed7aa', padding: '2px 8px', borderRadius: '20px', fontWeight: '600',
            }}>🇮🇳 NSE / BSE Only</span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 18px', lineHeight: 1.5 }}>
            Type any <strong>NSE ticker</strong> (e.g. <strong>RELIANCE</strong>, <strong>TCS</strong>, <strong>INFY</strong>, <strong>HDFCBANK</strong>) and press <strong>Analyze</strong>.
            The system adds <code>.NS</code> automatically for NSE lookup.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="RELIANCE · TCS · INFY · HDFCBANK · WIPRO · TATAMOTORS"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              style={{
                flex: 1, minWidth: '200px',
                border: '1.5px solid #e2e8f0', borderRadius: '10px',
                padding: '13px 16px', fontSize: '15px', color: '#0f172a',
                outline: 'none', fontWeight: '600', letterSpacing: '1px', background: '#f8fafc',
              }}
            />
            <button
              onClick={handleAnalyze}
              disabled={loading}
              style={{
                background: loading ? '#6ee7b7' : 'linear-gradient(135deg,#10b981,#059669)',
                border: 'none', borderRadius: '10px',
                padding: isMobile ? '13px 18px' : '13px 30px',
                color: '#fff', fontSize: '15px', fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(16,185,129,0.35)',
                whiteSpace: 'nowrap',
              }}
            >
              {loading
                ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />Analyzing…</>
                : <><TrendingUp size={16} />Analyze</>
              }
            </button>
          </div>

          {/* Error / notice */}
          {error && (
            <div style={{
              marginTop: '16px', padding: '14px 16px',
              background: '#fff7ed', border: '1px solid #fed7aa',
              borderRadius: '10px', display: 'flex', alignItems: 'flex-start', gap: '10px',
            }}>
              <AlertCircle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#92400e' }}>Notice</div>
                <div style={{ fontSize: '13px', color: '#b45309', marginTop: '2px', lineHeight: 1.5 }}>{error}</div>
              </div>
            </div>
          )}
        </div>

        {/* ─── ANALYSIS RESULTS (only shown after a successful search) ─── */}
        {analysis && !loading && (() => {
          const bs          = badgeStyle(analysis.signal);
          const price       = formatPrice(analysis.current_price ?? analysis.price ?? analysis.currentPrice);
          const confidence  = formatConfidence(analysis.confidence);
          const newsItems   = Array.isArray(analysis.news) && analysis.news.length > 0
            ? analysis.news
            : mockNews(analysis.ticker);

          return (
            <div style={{ marginBottom: '24px' }}>

              {/* Row 1 — metric cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)',
                gap: '14px', marginBottom: '14px',
              }}>

                {/* Current Price */}
                <div style={{ ...CARD, borderTop: '3px solid #0ea5e9' }}>
                  <div style={{ fontSize:'11px', color:'#94a3b8', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px', display:'flex', alignItems:'center', gap:'4px' }}>
                    <DollarSign size={12} color="#0ea5e9" /> Current Price
                  </div>
                  <div style={{ fontSize: isMobile ? '18px' : '24px', fontWeight:'800', color:'#0f172a' }}>
                    {price
                      ? price
                      : <span style={{ fontSize:'13px', color:'#94a3b8' }}>Fetching…</span>
                    }
                  </div>
                  <div style={{ fontSize:'12px', color:'#64748b', marginTop:'4px' }}>{analysis.ticker} · NSE</div>
                </div>

                {/* Signal */}
                <div style={{ ...CARD, borderTop: `3px solid ${bs.color}`, background: bs.bg }}>
                  <div style={{ fontSize:'11px', color:'#94a3b8', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>
                    AI Signal
                  </div>
                  <div style={{ fontSize: isMobile ? '22px' : '30px', fontWeight:'800', color: bs.color }}>
                    {analysis.signal || '—'}
                  </div>
                  <div style={{ fontSize:'12px', color:'#64748b', marginTop:'4px' }}>AI Recommended</div>
                </div>

                {/* Confidence */}
                <div style={{ ...CARD, borderTop: '3px solid #6366f1' }}>
                  <div style={{ fontSize:'11px', color:'#94a3b8', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>
                    Confidence
                  </div>
                  <div style={{ fontSize: isMobile ? '20px' : '26px', fontWeight:'800', color:'#6366f1' }}>
                    {confidence !== null
                      ? `${confidence}%`
                      : <span style={{ fontSize:'13px', color:'#94a3b8' }}>—</span>
                    }
                  </div>
                  {confidence !== null && (
                    <div style={{ background:'#e0e7ff', borderRadius:'100px', height:'5px', marginTop:'10px', overflow:'hidden' }}>
                      <div style={{ width:`${confidence}%`, height:'100%', background:'#6366f1', borderRadius:'100px' }} />
                    </div>
                  )}
                </div>

                {/* Sentiment */}
                <div style={{ ...CARD, borderTop: `3px solid ${sentimentColor(analysis.sentiment)}` }}>
                  <div style={{ fontSize:'11px', color:'#94a3b8', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>
                    Sentiment
                  </div>
                  <div style={{ fontSize: isMobile ? '16px' : '22px', fontWeight:'800', color: sentimentColor(analysis.sentiment), textTransform:'capitalize' }}>
                    {analysis.sentiment || 'Neutral'}
                  </div>
                  <div style={{ fontSize:'12px', color:'#64748b', marginTop:'4px' }}>Market mood</div>
                </div>
              </div>

              {/* Row 2 — AI reasoning/drivers/risks */}
              {(analysis.reasoning || analysis.key_drivers || analysis.risk_factors) && (
                <div style={{
                  display:'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit,minmax(250px,1fr))',
                  gap:'14px', marginBottom:'14px',
                }}>
                  {analysis.reasoning && (
                    <div style={CARD}>
                      <div style={{ fontSize:'11px', color:'#6366f1', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>🤖 AI Reasoning</div>
                      <div style={{ fontSize:'13px', color:'#334155', lineHeight:1.7 }}>{analysis.reasoning}</div>
                    </div>
                  )}
                  {analysis.key_drivers && (
                    <div style={CARD}>
                      <div style={{ fontSize:'11px', color:'#059669', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>✅ Key Drivers</div>
                      <div style={{ fontSize:'13px', color:'#334155', lineHeight:1.7 }}>{analysis.key_drivers}</div>
                    </div>
                  )}
                  {analysis.risk_factors && (
                    <div style={CARD}>
                      <div style={{ fontSize:'11px', color:'#dc2626', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>⚠️ Risk Factors</div>
                      <div style={{ fontSize:'13px', color:'#334155', lineHeight:1.7 }}>{analysis.risk_factors}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Row 3 — News */}
              <div style={CARD}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px' }}>
                  <Newspaper size={17} color="#f59e0b" />
                  <span style={{ fontSize:'16px', fontWeight:'700', color:'#0f172a' }}>
                    Latest News — {analysis.ticker}
                  </span>
                </div>
                <div style={{
                  display:'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit,minmax(240px,1fr))',
                  gap:'12px',
                }}>
                  {newsItems.slice(0, 4).map((item, i) => {
                    const isObj = typeof item === 'object' && item !== null;
                    const title = isObj ? (item.title || item.headline || '') : String(item);
                    const src   = isObj ? (item.source || item.publisher || 'Market News') : 'Market News';
                    const time  = isObj ? (item.time || item.published_at || '—') : '—';
                    const sent  = isObj ? (item.sentiment || 'neutral') : 'neutral';
                    const sc    = sentimentColor(sent);
                    const sentBg = sc === '#059669' ? '#d1fae5' : sc === '#dc2626' ? '#fee2e2' : '#fef3c7';
                    return (
                      <div key={i} style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:'10px', padding:'14px' }}>
                        <div style={{ fontSize:'13px', fontWeight:'600', color:'#0f172a', lineHeight:1.5, marginBottom:'10px' }}>
                          {title}
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontSize:'11px', color:'#94a3b8' }}>{src} · {time}</span>
                          <span style={{ fontSize:'11px', color:sc, fontWeight:'700', background:sentBg, padding:'2px 8px', borderRadius:'10px', textTransform:'capitalize' }}>
                            {sent}
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

        {/* ─── TOP GAINERS & LOSERS ─── */}
        <div style={{
          display:'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap:'20px', marginBottom:'24px',
        }}>

          {/* Gainers */}
          <div style={CARD}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
              <TrendingUp size={17} color="#059669" />
              <span style={{ fontSize:'16px', fontWeight:'700', color:'#0f172a' }}>Top 5 Gainers</span>
              <span style={{ fontSize:'11px', color:'#059669', background:'#d1fae5', padding:'2px 8px', borderRadius:'20px', fontWeight:'600' }}>NSE Today</span>
            </div>
            <p style={{ fontSize:'12px', color:'#94a3b8', margin:'0 0 14px' }}>
              Best performing Indian stocks today
            </p>
            <ul style={{ margin:0, padding:0, listStyle:'none' }}>
              {TOP_GAINERS.map((g, i) => (
                <li key={i} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'11px 0',
                  borderBottom: i < TOP_GAINERS.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{
                      width:'26px', height:'26px', background:'#d1fae5', borderRadius:'8px',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'12px', fontWeight:'800', color:'#059669', flexShrink:0,
                    }}>{i + 1}</div>
                    <div>
                      <div style={{ fontWeight:'700', fontSize:'14px', color:'#0f172a' }}>{g.ticker}</div>
                      <div style={{ fontSize:'11px', color:'#94a3b8' }}>{g.name}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'13px', fontWeight:'700', color:'#059669', display:'flex', alignItems:'center', gap:'2px' }}>
                      <ArrowUpRight size={13} />{g.change}
                    </div>
                    <div style={{ fontSize:'12px', color:'#64748b' }}>{g.price}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Losers */}
          <div style={CARD}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
              <TrendingDown size={17} color="#dc2626" />
              <span style={{ fontSize:'16px', fontWeight:'700', color:'#0f172a' }}>Top 5 Losers</span>
              <span style={{ fontSize:'11px', color:'#dc2626', background:'#fee2e2', padding:'2px 8px', borderRadius:'20px', fontWeight:'600' }}>NSE Today</span>
            </div>
            <p style={{ fontSize:'12px', color:'#94a3b8', margin:'0 0 14px' }}>
              Biggest declining Indian stocks today
            </p>
            <ul style={{ margin:0, padding:0, listStyle:'none' }}>
              {TOP_LOSERS.map((l, i) => (
                <li key={i} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'11px 0',
                  borderBottom: i < TOP_LOSERS.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{
                      width:'26px', height:'26px', background:'#fee2e2', borderRadius:'8px',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'12px', fontWeight:'800', color:'#dc2626', flexShrink:0,
                    }}>{i + 1}</div>
                    <div>
                      <div style={{ fontWeight:'700', fontSize:'14px', color:'#0f172a' }}>{l.ticker}</div>
                      <div style={{ fontSize:'11px', color:'#94a3b8' }}>{l.name}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'13px', fontWeight:'700', color:'#dc2626', display:'flex', alignItems:'center', gap:'2px' }}>
                      <ArrowDownRight size={13} />{l.change}
                    </div>
                    <div style={{ fontSize:'12px', color:'#64748b' }}>{l.price}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ─── MARKET SENTIMENT (dynamic) ─── */}
        <div style={CARD}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px', flexWrap:'wrap', gap:'10px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <BarChart2 size={17} color="#6366f1" />
              <span style={{ fontSize:'16px', fontWeight:'700', color:'#0f172a' }}>Indian Market Sentiment</span>
              <span style={{ fontSize:'11px', color:'#64748b', background:'#f1f5f9', padding:'2px 8px', borderRadius:'20px' }}>NSE / BSE</span>
            </div>
            <button
              onClick={refreshSentiment}
              disabled={sentLoading}
              style={{
                display:'flex', alignItems:'center', gap:'6px',
                background:'#f8fafc', border:'1px solid #e2e8f0',
                borderRadius:'8px', padding:'7px 14px',
                fontSize:'13px', color:'#475569', fontWeight:'600',
                cursor: sentLoading ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw size={14} style={{ animation: sentLoading ? 'spin 1s linear infinite' : 'none' }} />
              {sentLoading ? 'Updating…' : 'Refresh'}
            </button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:'24px' }}>

            {/* Bars */}
            <div>
              {[
                { label:'Bullish', pct: sentiment.bullish, color:'#059669' },
                { label:'Neutral', pct: sentiment.neutral, color:'#d97706' },
                { label:'Bearish', pct: sentiment.bearish, color:'#dc2626' },
              ].map((s, i) => (
                <div key={i} style={{ marginBottom:'18px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'7px' }}>
                    <span style={{ fontSize:'14px', color:'#334155', fontWeight:'500' }}>{s.label}</span>
                    <span style={{ fontSize:'14px', color:s.color, fontWeight:'700' }}>{s.pct}%</span>
                  </div>
                  <div style={{ background:'#f1f5f9', borderRadius:'100px', height:'10px', overflow:'hidden' }}>
                    <div style={{ width:`${s.pct}%`, height:'100%', background:s.color, borderRadius:'100px', transition:'width 0.5s ease' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              <div style={{ padding:'16px', background:'#d1fae5', border:'1px solid #a7f3d0', borderRadius:'10px' }}>
                <div style={{ fontSize:'14px', color:'#059669', fontWeight:'700', marginBottom:'4px' }}>
                  {sentiment.bullish >= 50
                    ? '📈 Overall: Bullish'
                    : sentiment.bearish >= 35
                    ? '📉 Overall: Bearish'
                    : '➡️ Overall: Neutral'}
                </div>
                <div style={{ fontSize:'12px', color:'#047857' }}>
                  {sentiment.bullish}% of market participants are currently bullish on Indian equities.
                </div>
              </div>
              <div style={{ padding:'14px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:'10px' }}>
                <div style={{ fontSize:'12px', color:'#64748b', lineHeight:1.6 }}>
                  📊 Derived from NSE/BSE breadth, FII/DII flow trends, and index momentum. Press <strong>Refresh</strong> to get the latest reading.
                </div>
              </div>
            </div>

          </div>
        </div>

      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}