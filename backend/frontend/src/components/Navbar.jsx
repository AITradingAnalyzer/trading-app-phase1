// src/components/Navbar.jsx
import { NavLink } from "react-router-dom";
import { Home, TrendingUp, History, Settings } from "lucide-react";
import "../styles/Navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1>AI Trading Analyzer</h1>
      </div>
      <div className="navbar-links">
        <NavLink to="/" className={({ isActive }) => (isActive ? "active" : "")}>
          <Home size={18} /> Home
        </NavLink>
        <NavLink to="/suggestions" className={({ isActive }) => (isActive ? "active" : "")}>
          <TrendingUp size={18} /> Suggestions
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => (isActive ? "active" : "")}>
          <History size={18} /> History
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>
          <Settings size={18} /> Settings
        </NavLink>
      </div>
    </nav>
  );
}

export default Navbar;