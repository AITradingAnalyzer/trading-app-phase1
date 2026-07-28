import { DarkModeProvider } from './context/DarkModeContext.jsx';
import Home from './pages/Home.jsx';

function App() {
  return (
    <DarkModeProvider>
      <Home />
    </DarkModeProvider>
  );
}

export default App;