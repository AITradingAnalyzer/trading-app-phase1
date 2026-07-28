import React from 'react';
import { DarkModeProvider } from './context/DarkModeContext';
import Home from './pages/Home';

function App() {
  return (
    <DarkModeProvider>
      <Home />
    </DarkModeProvider>
  );
}

export default App;