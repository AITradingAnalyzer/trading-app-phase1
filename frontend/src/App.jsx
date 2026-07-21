import Home from './pages/Home';
import Footer from './components/Footer';

function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
      <Home />
      <Footer />
    </div>
  );
}

export default App;