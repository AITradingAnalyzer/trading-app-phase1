import Home from './pages/Home';
import Footer from './components/Footer';

function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0b0f1a' }}>
      <Home />
      <Footer />
    </div>
  );
}

export default App;