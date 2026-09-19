import React from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useApp } from './context/AppContext';
import AmbientBackground from './components/AmbientBackground';
import AppShell from './components/AppShell';
import ToastHost from './components/ToastHost';
import { Button, Spinner } from './components/ui';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import SubjectsHub from './pages/SubjectsHub';
import SubjectDetail from './pages/SubjectDetail';
import QuestionStudio from './pages/QuestionStudio';
import ReviewSession from './pages/ReviewSession';
import AnalyticsHub from './pages/AnalyticsHub';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Uncaught UI error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
          <div className="glass-card max-w-md p-8 shadow-lift">
            <h2 className="text-2xl font-extrabold text-slate-900">Something went wrong</h2>
            <p className="mt-2 text-sm text-slate-600">
              {this.state.error?.message || 'An unexpected error occurred while loading this view.'}
            </p>
            <Button
              variant="dark"
              className="mt-6 w-full"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/dashboard';
              }}
            >
              Reload Dashboard
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Redirects to /login unless a learner session exists. */
function RequireLearner() {
  const { learner, checking } = useApp();
  if (checking) return <Spinner label="Starting Memora" />;
  if (!learner) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AmbientBackground />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />

          <Route element={<RequireLearner />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/subjects" element={<SubjectsHub />} />
              <Route path="/subjects/:subjectId" element={<SubjectDetail />} />
              <Route path="/subjects/:subjectId/topics/:topicId/questions" element={<QuestionStudio />} />
              <Route path="/analytics" element={<AnalyticsHub />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            {/* Focus mode: the quiz runner has no sidebar */}
            <Route path="/quiz/:topicId" element={<ReviewSession />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        <ToastHost />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
