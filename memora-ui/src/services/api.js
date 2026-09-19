const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

async function request(path, { method = 'GET', params, body } = {}) {
  const url = new URL(BASE + path);
  if (params) Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`Can't reach the MEMORA API at ${BASE}. Start the Flask backend (python app.py) and retry.`);
  }
  if (res.status === 204) return {};
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
  return data ?? {};
}

export const api = {
  baseUrl: BASE,
  health: () => request('/api/health'),
  learners: () => request('/api/learners'),
  createLearner: (name) => request('/api/learners', { method: 'POST', body: { name } }),
  concepts: (learner_id) => request('/api/concepts', { params: { learner_id } }),
  weakConcepts: (learner_id) => request('/api/concepts/weak', { params: { learner_id } }),
  addConcept: (learner_id, payload) => request(`/api/learners/${learner_id}/concepts`, { method: 'POST', body: payload }),
  deleteConcept: (learner_id, concept_id) => request(`/api/learners/${learner_id}/concepts/${concept_id}`, { method: 'DELETE' }),
  generateSchedule: (learner_id) => request('/api/schedule/generate', { method: 'POST', body: { learner_id } }),
  predictRetention: (learner_id, concept_id) => request('/api/retention/predict', { method: 'POST', body: { learner_id, concept_id } }),
  quizQuestions: (learner_id, concept_id, limit = 5) => request('/api/quiz/questions', { params: { learner_id, concept_id, limit } }),
  quizAttempt: (payload) => request('/api/quiz/attempt', { method: 'POST', body: payload }),
  quizSubmit: (payload) => request('/api/quiz/submit', { method: 'POST', body: payload }),
  analytics: (learner_id) => request('/api/analytics', { params: { learner_id } }),
  advanceDay: (by = 1) => request('/api/day/advance', { method: 'POST', body: { by } }),
  reset: () => request('/api/reset', { method: 'POST' }),
};
