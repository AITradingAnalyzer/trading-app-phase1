// src/App.jsx
import Dashboard from './pages/Dashboard';
import Footer from './components/Footer';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Suggestions from "./pages/Suggestions";
import History from "./pages/History";
import Settings from "./pages/Settings";
function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0b0f1a' }}>
      <Dashboard />
      <Footer />
    </div>
  );
}

export default App;
