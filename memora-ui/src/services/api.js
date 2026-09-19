import { mockRequest } from './mockBackend';

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const FORCE_MOCK = String(import.meta.env.VITE_USE_MOCK || '').toLowerCase() === 'true';

/* ------------------------------------------------------------------
   Backend mode detection
   - "live": the REST API answered at BASE
   - "demo": nothing answered, so requests are served by the built-in
             localStorage backend (src/services/mockBackend.js)
------------------------------------------------------------------- */
let mode = FORCE_MOCK ? 'demo' : null;
let probe = null;
const listeners = new Set();

function setMode(next) {
  if (mode !== next) {
    mode = next;
    listeners.forEach((fn) => fn(next));
  }
}

export const getApiMode = () => mode;
export const getApiBase = () => BASE;
export const onModeChange = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function detectMode() {
  if (mode) return Promise.resolve(mode);
  if (!probe) {
    probe = fetch(`${BASE}/api/learners`, {
      signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(2500) : undefined,
    })
      .then(() => { setMode('live'); return 'live'; }) // any HTTP answer means the server is reachable
      .catch(() => { setMode('demo'); return 'demo'; });
  }
  return probe;
}

/* ------------------------------------------------------------------
   Request helper (contract-compliant)
------------------------------------------------------------------- */
async function request(path, { method = 'GET', params, body } = {}) {
  if ((await detectMode()) === 'demo') return mockRequest(path, { method, params, body });

  const url = new URL(path, BASE || window.location.origin);
  if (params) Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`Cannot reach the MEMORA API at ${BASE}. Is the backend running?`);
  }
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || errData.message || `Request failed with status ${res.status}`);
  }
  return res.json().catch(() => ({}));
}

/* ------------------------------------------------------------------
   Public API
------------------------------------------------------------------- */
export const api = {
  getLearners: () => request('/api/learners'),
  createLearner: (data) => request('/api/learners', { method: 'POST', body: data }),
  getAnalytics: (learnerId) => request(`/api/analytics?learner_id=${learnerId}`),
  getConcepts: (learnerId) => request(`/api/concepts?learner_id=${learnerId}`),
  getWeakConcepts: (learnerId) => request(`/api/concepts/weak?learner_id=${learnerId}`),
  getSchedule: (learnerId) => request('/api/schedule/generate', { method: 'POST', body: { learner_id: learnerId } }),
  predictRetention: (learnerId, conceptId) =>
    request('/api/retention/predict', { method: 'POST', body: { learner_id: learnerId, concept_id: conceptId } }),
  getSubjects: (learnerId) => request(`/api/subjects?learner_id=${learnerId}`),
  createSubject: (learnerId, subjectData) =>
    request('/api/subjects', { method: 'POST', body: { learner_id: learnerId, ...subjectData } }),
  getSubjectDetail: (subjectId) => request(`/api/subjects/${subjectId}`),
  createTopic: (subjectId, topicData) => request(`/api/subjects/${subjectId}/topics`, { method: 'POST', body: topicData }),
  getQuestions: (topicId) => request(`/api/topics/${topicId}/questions`),
  createQuestion: (topicId, questionData) =>
    request(`/api/topics/${topicId}/questions`, { method: 'POST', body: questionData }),
  getQuizQuestions: (learnerId, conceptId, limit = 5) =>
    request(`/api/quiz/questions?learner_id=${learnerId}&concept_id=${conceptId}&limit=${limit}`),
  submitQuizAttempt: (attemptData) => request('/api/quiz/attempt', { method: 'POST', body: attemptData }),
  advanceDay: (days) => request('/api/day/advance', { method: 'POST', body: { by: days } }),
  resetDemo: () => request('/api/reset', { method: 'POST' }),

  // Optional extensions used by the Question Studio (edit / delete).
  // The demo backend implements them; a live backend must expose PUT/DELETE /api/questions/:id.
  updateQuestion: (questionId, questionData) =>
    request(`/api/questions/${questionId}`, { method: 'PUT', body: questionData }),
  deleteQuestion: (questionId) => request(`/api/questions/${questionId}`, { method: 'DELETE' }),
};
