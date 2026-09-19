import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const Ctx = createContext(null);
export const useApp = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside <AppProvider>');
  return v;
};

const KEY = 'memora.learner';
const EMPTY = { concepts: [], weak: [], schedule: [], overdue: 0, analytics: null };

export function AppProvider({ children }) {
  const [learners, setLearners] = useState([]);
  const [learnerId, setLearnerId] = useState('');
  const [data, setData] = useState(EMPTY);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [chartConceptId, setChartConceptId] = useState('');
  const [quizConcept, setQuizConcept] = useState(null);
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback((message, type = 'info') => {
    const id = `${Date.now()}${Math.random()}`;
    setToasts((t) => [...t.slice(-3), { id, message, type }]);
    setTimeout(() => dismissToast(id), 4500);
  }, [dismissToast]);

  const refresh = useCallback(async (id) => {
    if (!id) return;
    try {
      const [c, w, s, a] = await Promise.all([
        api.concepts(id), api.weakConcepts(id), api.generateSchedule(id), api.analytics(id),
      ]);
      setData({
        concepts: c.concepts || [],
        weak: w.weak_concepts || [],
        schedule: s.schedule || [],
        overdue: s.overdue_count || 0,
        analytics: a,
      });
      setStatus('ready');
      setError('');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }, []);

  const bootstrap = useCallback(async (preferred) => {
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    try {
      const { learners: list = [] } = await api.learners();
      setLearners(list);
      const stored = preferred || localStorage.getItem(KEY);
      const pick = list.find((l) => l.learner_id === stored)?.learner_id || list[0]?.learner_id || '';
      setLearnerId(pick);
      if (pick) {
        localStorage.setItem(KEY, pick);
        await refresh(pick);
      } else {
        setData(EMPTY);
        setStatus('ready');
      }
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }, [refresh]);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  useEffect(() => {
    const cs = data.concepts;
    if (!cs.length || cs.some((c) => c.concept_id === chartConceptId)) return;
    setChartConceptId([...cs].sort((a, b) => a.retention - b.retention)[0].concept_id);
  }, [data.concepts, chartConceptId]);

  const act = useCallback(async (fn, okMsg) => {
    setBusy(true);
    try {
      const r = await fn();
      await refresh(learnerId);
      if (okMsg) toast(okMsg, 'success');
      return r;
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }, [learnerId, refresh, toast]);

  const value = useMemo(() => ({
    learners, learnerId, ...data, status, error, busy, toasts, dismissToast, toast,
    day: data.analytics?.current_day ?? 0,
    learner: learners.find((l) => l.learner_id === learnerId),
    chartConceptId, setChartConceptId,
    quizConcept,
    reload: () => bootstrap(learnerId),
    refreshNow: () => act(async () => {}, 'Schedule refreshed'),
    selectLearner: (id) => { setLearnerId(id); localStorage.setItem(KEY, id); setChartConceptId(''); refresh(id); },
    advanceDay: (by) => act(() => api.advanceDay(by), `Advanced ${by === 1 ? '1 day' : `${by} days`}`),
    resetDemo: async () => {
      setBusy(true);
      try { await api.reset(); await bootstrap(); toast('Demo data reset', 'success'); }
      catch (e) { toast(e.message, 'error'); }
      finally { setBusy(false); }
    },
    createLearner: async (name) => {
      setBusy(true);
      try { const r = await api.createLearner(name); await bootstrap(r.learner_id); toast(`Added learner ${name}`, 'success'); }
      catch (e) { toast(e.message, 'error'); }
      finally { setBusy(false); }
    },
    addConcept: (payload) => act(() => api.addConcept(learnerId, payload), `Added ${payload.name}`),
    removeConcept: (c) => act(() => api.deleteConcept(learnerId, c.concept_id), `Removed ${c.name}`),
    openQuiz: (c) => setQuizConcept(c),
    closeQuiz: () => { setQuizConcept(null); refresh(learnerId); },
  }), [learners, learnerId, data, status, error, busy, toasts, chartConceptId, quizConcept, act, bootstrap, refresh, toast, dismissToast]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
