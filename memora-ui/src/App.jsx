import { Link, Route, Routes } from 'react-router-dom';
import { Loader2, WifiOff } from 'lucide-react';
import Navbar from './components/Navbar';
import QuizModal from './components/QuizModal';
import Toast from './components/Toast';
import Dashboard from './pages/Dashboard';
import Concepts from './pages/Concepts';
import Schedule from './pages/Schedule';
import Analytics from './pages/Analytics';
import About from './pages/About';
import { useApp } from './context/AppContext';

function NotFound() {
  return (
    <div className="glass mx-auto mt-16 max-w-md p-10 text-center">
      <p className="text-4xl font-extrabold text-white">404</p>
      <p className="muted mt-2">That page doesn't exist.</p>
      <Link to="/" className="btn-primary mt-5">Go to dashboard</Link>
    </div>
  );
}

function Gate({ children }) {
  const { status, error, reload } = useApp();
  if (status === 'loading') return <div className="grid place-items-center py-32"><Loader2 className="animate-spin text-indigo-300" size={32} aria-label="Loading" /></div>;
  if (status === 'error') {
    return (
      <div className="glass mx-auto mt-16 max-w-lg p-8 text-center">
        <WifiOff className="mx-auto text-rose-400" size={32} aria-hidden />
        <h1 className="mt-3 text-xl font-bold text-white">Can't load your data</h1>
        <p className="muted mt-2">{error}</p>
        <button className="btn-primary mt-5" onClick={reload}>Try again</button>
      </div>
    );
  }
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Gate>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/concepts" element={<Concepts />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Gate>
      </main>
      <footer className="mx-auto max-w-7xl px-6 pb-8 text-xs text-slate-500">Memora · Cognitive learning retention · MIT License</footer>
      <QuizModal />
      <Toast />
    </>
  );
}
