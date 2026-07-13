import { NavLink } from "react-router-dom";

const linkStyle = {
  textDecoration: "none",
  color: "#fff",
  padding: "8px 14px",
  borderRadius: "8px",
};

export default function Navbar() {
  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 24px",
        background: "#111827",
        color: "#fff",
      }}
    >
      <h2 style={{ margin: 0 }}>AI Trading Analyzer</h2>

      <div style={{ display: "flex", gap: "10px" }}>
        <NavLink to="/" style={linkStyle}>Dashboard</NavLink>
        <NavLink to="/signals" style={linkStyle}>Signals</NavLink>
        <NavLink to="/history" style={linkStyle}>History</NavLink>
        <NavLink to="/settings" style={linkStyle}>Settings</NavLink>
      </div>
    </nav>
  );
}
