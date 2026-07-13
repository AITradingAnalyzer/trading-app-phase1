import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import '../styles/Navbar.css';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          🎯 AI Fiesta Trader
        </Link>
        
        <button 
          className="menu-toggle" 
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <ul className={`nav-menu ${isOpen ? 'active' : ''}`}>
          <li className="nav-item">
            <Link to="/" className="nav-link" onClick={() => setIsOpen(false)}>
              Dashboard
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/signals" className="nav-link" onClick={() => setIsOpen(false)}>
              Signals
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/history" className="nav-link" onClick={() => setIsOpen(false)}>
              History
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/settings" className="nav-link" onClick={() => setIsOpen(false)}>
              Settings
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
