# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.




# Trading App — Phase 1 (AI Trading Analyzer)

A modern, production-ready AI-powered trading signals platform.  
Phase 1 is complete and live on Netlify with full backend integration.

---

## 🚀 Live Demo

- **Frontend**: [https://trading-app-phase1.netlify.app](https://trading-app-phase1.netlify.app)
- **Backend**: [https://trading-app-phase1-production.up.railway.app](https://trading-app-phase1-production.up.railway.app)

---

## ✨ Phase 1 Features

### Pages
- **Dashboard** — Overview, scheduler status, quick navigation
- **Signals** — Live trading signals from AI (with mock fallback)
- **History** — Manual trade logging + P&L tracking with CSV export
- **Settings** — Risk management, preferences, backend status

### Core Capabilities
- React + Vite + React Router
- Fully responsive dark theme design system
- Backend API integration (Railway + FastAPI)
- Background scheduler running every 4 hours
- LocalStorage persistence for trades and settings
- Graceful error handling with mock data fallback
- CSV export for trade history

---

## 🛠️ Tech Stack

### Frontend
- React 18 + Vite
- React Router v6
- Lucide React icons
- CSS modules (custom dark theme)

### Backend
- FastAPI (Python)
- PostgreSQL (via Railway)
- APScheduler (background analysis)
- SQLAlchemy + Alembic
- CORS enabled for Netlify + localhost

### Deployment
- **Frontend**: Netlify (auto-deploy on push)
- **Backend**: Railway (auto-deploy on push)

---

## 📁 Project Structure

