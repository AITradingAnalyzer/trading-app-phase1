import { useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import '../styles/Pages.css';

function Settings() {
  const [settings, setSettings] = useState({
    apiUrl: 'http://localhost:8000',
    riskPerTrade: 2,
    maxDailyLoss: 500,
    theme: 'dark',
    notifications: true,
  });

  const [saved, setSaved] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value,
    });
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="page">
      <h1 className="page-title">Settings</h1>

      <div className="card">
        <h2>API Configuration</h2>
        <div className="form-group">
          <label htmlFor="apiUrl">API URL</label>
          <input
            type="text"
            id="apiUrl"
            name="apiUrl"
            value={settings.apiUrl}
            onChange={handleChange}
            className="form-input"
          />
          <small style={{ color: '#b0b0b0', marginTop: '0.5rem', display: 'block' }}>
            Base URL for backend API calls
          </small>
        </div>
      </div>

      <div className="card">
        <h2>Risk Management</h2>
        <div className="form-group">
          <label htmlFor="riskPerTrade">Risk Per Trade (%)</label>
          <input
            type="number"
            id="riskPerTrade"
            name="riskPerTrade"
            value={settings.riskPerTrade}
            onChange={handleChange}
            min="0.1"
            max="10"
            step="0.1"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="maxDailyLoss">Max Daily Loss (₹)</label>
          <input
            type="number"
            id="maxDailyLoss"
            name="maxDailyLoss"
            value={settings.maxDailyLoss}
            onChange={handleChange}
            min="0"
            className="form-input"
          />
        </div>
      </div>

      <div className="card">
        <h2>Preferences</h2>
        <div className="form-group">
          <label htmlFor="theme">Theme</label>
          <select
            id="theme"
            name="theme"
            value={settings.theme}
            onChange={handleChange}
            className="form-input"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="auto">Auto</option>
          </select>
        </div>

        <div className="form-group checkbox">
          <label htmlFor="notifications">
            <input
              type="checkbox"
              id="notifications"
              name="notifications"
              checked={settings.notifications}
              onChange={handleChange}
            />
            Enable Push Notifications
          </label>
        </div>
      </div>

      {saved && (
        <div className="alert alert-success">
          <AlertCircle size={16} /> Settings saved successfully!
        </div>
      )}

      <button className="btn btn-primary" onClick={handleSave} style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Save size={18} /> Save Settings
      </button>
    </div>
  );
}

export default Settings;