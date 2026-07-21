import { TrendingUp } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      background: '#ffffff',
      borderTop: '1px solid #e2e8f0',
      padding: '18px 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
        <TrendingUp size={15} color="#10b981" />
        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
          Trading Companion
        </span>
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>by Waseem</span>
      </div>
      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
        © {new Date().getFullYear()} Waseem. All rights reserved.
      </span>
      <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
        For informational purposes only · Not financial advice
      </span>
    </footer>
  );
}