import { TrendingUp } from 'lucide-react';

export default function Footer() {
  return (
    <footer
      style={{
        background: '#0f172a',
        borderTop: '1px solid #1e293b',
        padding: '20px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <TrendingUp size={15} color="#10b981" />
        <span style={{ fontSize: '13px', color: '#475569' }}>
          Trading Companion <span style={{ fontSize: '11px', color: '#334155' }}>by Waseem</span>
        </span>
      </div>

      <span style={{ fontSize: '12px', color: '#334155' }}>
        © {new Date().getFullYear()} Waseem. All rights reserved.
      </span>

      <span style={{ fontSize: '12px', color: '#334155' }}>
        For informational purposes only. Not financial advice.
      </span>
    </footer>
  );
}