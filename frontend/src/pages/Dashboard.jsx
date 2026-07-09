import React from 'react';
import { TrendingUp, AlertCircle, PieChart } from 'lucide-react';

const Dashboard = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ color: '#333' }}>AI Fiesta Trader ✨</h1>
        <p style={{ color: '#666' }}>Phase 1: Analysis Mode (Manual Execution)</p>
      </header>

      <div style={{ display: 'grid', gap: '20px' }}>
        {/* Signal Card */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981', marginBottom: '10px' }}>
            <TrendingUp size={24} />
            <h2 style={{ margin: 0 }}>Active Signal</h2>
          </div>
          <p><strong>Stock:</strong> RELIANCE</p>
          <p><strong>Action:</strong> <span style={{ color: '#10b981', fontWeight: 'bold' }}>BUY</span></p>
          <p style={{ color: '#666', fontSize: '14px' }}>Found via News Analysis: Strong Q1 results expected.</p>
        </div>

        {/* Status Card */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#3b82f6', marginBottom: '10px' }}>
            <PieChart size={24} />
            <h2 style={{ margin: 0 }}>Your Portfolio</h2>
          </div>
          <p style={{ color: '#666' }}>Manual Tracking: Go to Zerodha to see live P/L.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
