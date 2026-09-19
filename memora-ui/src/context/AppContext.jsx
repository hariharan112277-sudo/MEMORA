import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, detectMode, getApiMode, onModeChange } from '../services/api';
import { asList } from '../utils/memory';

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

const LEARNER_KEY = 'memora.learner';
const PROFILE_PREFIX = 'memora.profile.';

const readJSON = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
};

export const DEFAULT_NOTIFICATIONS = {
  daily_reminder: true,
  weak_alerts: true,
  streak_warning: true,
  weekly_report: false,
};

const buildProfile = (learner, stored) => ({
  name: learner?.name || '',
  goal: learner?.goal || '',
  daily_target: Number(learner?.daily_target) || 10,
  reminder_time: '19:00',
  ...stored,
  notifications: { ...DEFAULT_NOTIFICATIONS, ...(stored?.notifications || {}) },
});

const normalizeLearner = (l) => (l ? { ...l, id: l.id ?? l.learner_id, learner_id: l.learner_id ?? l.id } : null);

export function AppProvider({ children }) {
  const [learner, setLearner] = useState(() => normalizeLearner(readJSON(LEARNER_KEY)));
  const [profile, setProfile] = useState(() => {
    const l = normalizeLearner(readJSON(LEARNER_KEY));
    return l ? buildProfile(l, readJSON(PROFILE_PREFIX + l.id)) : null;
  });
  const [mode, setMode] = useState(getApiMode());
  const [version, setVersion] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [checking, setChecking] = useState(true);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const toast = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const login = useCallback((l) => {
    const norm = normalizeLearner(l);
    writeJSON(LEARNER_KEY, norm);
    setLearner(norm);
    setProfile(buildProfile(norm, readJSON(PROFILE_PREFIX + norm.id)));
    setVersion((v) => v + 1);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(LEARNER_KEY);
    setLearner(null);
    setProfile(null);
  }, []);

  const saveProfile = useCallback(
    (patch) => {
      if (!learner) return;
      const next = { ...profile, ...patch };
      setProfile(next);
      writeJSON(PROFILE_PREFIX + learner.id, next);
    },
    [learner, profile]
  );

  const advanceDay = useCallback(
    async (days) => {
      await api.advanceDay(days);
      toast(`Advanced ${days} day${days > 1 ? 's' : ''}. Memories have decayed accordingly.`);
      refresh();
    },
    [toast, refresh]
  );

  const resetAll = useCallback(async () => {
    await api.resetDemo();
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PROFILE_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
    const rawList = asList(await api.getLearners(), 'learners');
    const list = rawList.map(normalizeLearner);
    const next = list.find((l) => l.id === learner?.id) || list[0];
    if (next) login(next);
    else logout();
    toast('Demo data reset to its original state.');
  }, [learner, login, logout, toast]);

  // Detect live vs demo backend, then make sure the stored session still exists (or auto-login default learner).
  useEffect(() => {
    const off = onModeChange(setMode);
    let alive = true;
    (async () => {
      await detectMode();
      if (!alive) return;
      setMode(getApiMode());
      let stored = normalizeLearner(readJSON(LEARNER_KEY));
      try {
        const rawList = asList(await api.getLearners(), 'learners');
        const list = rawList.map(normalizeLearner);
        if (alive && list.length) {
          if (!stored || !list.some((l) => String(l.id) === String(stored.id))) {
            // Auto-login to available learner if stored session is missing or invalid
            const fallback = list.find((l) => l.id === 'L_HARIHARAN' || l.id === 'l_demo') || list[0];
            if (fallback) {
              login(fallback);
              stored = fallback;
            }
          }
        }
      } catch { /* keep session */ }
      if (alive) setChecking(false);
    })();
    return () => {
      alive = false;
      off();
    };
  }, [login]);

  const value = useMemo(
    () => ({ learner, profile, mode, version, checking, toasts, toast, dismissToast, login, logout, saveProfile, refresh, advanceDay, resetAll }),
    [learner, profile, mode, version, checking, toasts, toast, dismissToast, login, logout, saveProfile, refresh, advanceDay, resetAll]
  );
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
