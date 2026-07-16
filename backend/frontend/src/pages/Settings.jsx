import { useEffect, useState } from "react";
import { Save, RefreshCw, CheckCircle } from "lucide-react";
import { fetchSchedulerStatus } from "../api";
import { API_BASE_URL } from "../api";
import "../styles/Pages.css";

const SETTINGS_KEY = "app_settings";

const defaultSettings = {
  riskPerTrade: 2,
  maxDailyLoss: 500,
  theme: "dark",
  notifications: true,
};

function Settings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [schedulerInfo, setSchedulerInfo] = useState(null);
  const [saved, setSaved] = useState(false);
  const [schedulerLoading, setSchedulerLoading] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      } catch {
        setSettings(defaultSettings);
      }
    }
  }, []);

  useEffect(() => {
    loadSchedulerStatus();
  }, []);

  const loadSchedulerStatus = async () => {
    setSchedulerLoading(true);
    try {
      const data = await fetchSchedulerStatus();
      setSchedulerInfo(data);
    } catch {
      setSchedulerInfo(null);
    } finally {
      setSchedulerLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? parseFloat(value) || 0 : value,
    }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="page">
      <h1 className="page-title">Settings</h1>

      {/* Backend Status */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Backend Status</h2>
          <button className="btn btn-secondary" onClick={loadSchedulerStatus} style={{ padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {schedulerLoading ? (
          <p style={{ marginTop: "1rem", color: "#b0b0b0" }}>Checking backend...</p>
        ) : schedulerInfo ? (
          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <p>
              <strong>API URL:</strong>{" "}
              <code style={{ color: "#00d4ff" }}>{API_BASE_URL}</code>
            </p>
            <p>
              <strong>Scheduler:</strong>{" "}
              <span style={{ color: schedulerInfo.running ? "#00ff41" : "#ff006e" }}>
                {schedulerInfo.running ? "✅ Running" : "❌ Stopped"}
              </span>
            </p>
            <p>
              <strong>Interval:</strong> Every {schedulerInfo.interval_hours} hour(s)
            </p>
            <p>
              <strong>Next Run:</strong>{" "}
              <span style={{ color: "#b0b0b0" }}>{schedulerInfo.next_run_time || "Not scheduled"}</span>
            </p>
          </div>
        ) : (
          <div style={{ marginTop: "1rem" }}>
            <p style={{ color: "#ffa500" }}>
              ⚠️ Backend is not responding. Make sure Railway is running.
            </p>
            <p style={{ color: "#b0b0b0", fontSize: "0.9rem", marginTop: "0.5rem" }}>
              Expected API: <code>{API_BASE_URL}</code>
            </p>
          </div>
        )}
      </div>

      {/* Risk Management */}
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
          <small style={{ color: "#b0b0b0", display: "block", marginTop: "0.3rem" }}>
            Recommended: 1-3% of capital per trade
          </small>
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
            step="100"
            className="form-input"
          />
        </div>
      </div>

      {/* Preferences */}
      <div className="card">
        <h2>Preferences</h2>

        <div className="form-group">
          <label htmlFor="theme">Theme</label>
          <select id="theme" name="theme" value={settings.theme} onChange={handleChange} className="form-input">
            <option value="dark">Dark (Current)</option>
            <option value="light" disabled>Light (Coming soon)</option>
          </select>
        </div>

        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              name="notifications"
              checked={settings.notifications}
              onChange={handleChange}
            />{" "}
            Enable Push Notifications
          </label>
        </div>
      </div>

      {/* Save Button */}
      {saved && (
        <div className="alert alert-success" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <CheckCircle size={18} /> Settings saved to browser storage!
        </div>
      )}

      <button className="btn btn-primary" onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem", padding: "1rem 2rem" }}>
        <Save size={20} /> Save Settings
      </button>
    </div>
  );
}

export default Settings;