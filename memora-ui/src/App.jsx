import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useApp } from './context/AppContext';
import AmbientBackground from './components/AmbientBackground';
import AppShell from './components/AppShell';
import ToastHost from './components/ToastHost';
import { Spinner } from './components/ui';
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

/** Redirects to /login unless a learner session exists. */
function RequireLearner() {
  const { learner, checking } = useApp();
  if (checking) return <Spinner label="Starting Memora" />;
  if (!learner) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AmbientBackground />
      <Routes>
        <Route path="/" element={<LandingPage />} />
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
  );
}
