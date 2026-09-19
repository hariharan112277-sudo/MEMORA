// Built-in demo backend.
// Implements the same REST contract as the real MEMORA API (see api.js) on top of localStorage,
// so the UI is fully usable when no server is running on VITE_API_URL.

import { STARTER } from './starterContent';
import { buildCurve, daysUntilThreshold, DIFFICULTY_SCORE, healthOf } from '../utils/memory';

const KEY = 'memora.mock.v1';
const DEMO_ID = 'l_demo';
const DUE_THRESHOLD = 0.8;

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
let counter = 0;
const newId = (p) => `${p}_${Date.now().toString(36)}${(counter++).toString(36)}`;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ------------------------------ seed data ------------------------------ */

function instantiate(learnerId, tag, day) {
  const subjects = [];
  const topics = [];
  const questions = [];
  STARTER.forEach((sd) => {
    const sid = `s_${sd.key}_${tag}`;
    subjects.push({
      id: sid, learner_id: learnerId, name: sd.name, category: sd.category, color: sd.color,
      description: sd.description, created_day: day,
    });
    sd.topics.forEach((td) => {
      const tid = `t_${td.key}_${tag}`;
      topics.push({
        id: tid, subject_id: sid, name: td.name, module: td.module, description: td.description,
        difficulty: td.difficulty, strength: td.S, last_reviewed_day: day - td.ago,
        reviews: 0, correct: 0, ability: td.ability,
      });
      td.questions.forEach((q, i) => {
        questions.push({
          id: `q_${td.key}${i + 1}_${tag}`, topic_id: tid, text: q[0], options: q[1],
          correct_index: q[2], explanation: q[3], difficulty: q[4] || 'medium', created_day: day,
        });
      });
    });
  });
  return { subjects, topics, questions };
}

function makeHistory(learnerId, topics, questions, day) {
  const r = rng(42);
  const attempts = [];
  for (let d = day - 14; d < day; d++) {
    const n = d >= day - 5 ? 4 + Math.floor(r() * 6) : r() < 0.7 ? Math.floor(r() * 8) : 0;
    for (let i = 0; i < n; i++) {
      const t = topics[Math.floor(r() * topics.length)];
      const qs = questions.filter((q) => q.topic_id === t.id);
      const q = qs[Math.floor(r() * qs.length)];
      const correct = r() < t.ability;
      attempts.push({
        id: newId('a'), learner_id: learnerId, concept_id: t.id, question_id: q.id, correct,
        time_ms: Math.round(6000 + r() * 16000), day: d,
      });
      t.reviews += 1;
      if (correct) t.correct += 1;
    }
  }
  return attempts;
}

function seed() {
  const day = 30;
  const learner = {
    id: DEMO_ID, name: 'Demo Learner', email: 'demo@memora.app',
    goal: 'Retain what I study for the long term', daily_target: 10, created_day: 0,
  };
  const content = instantiate(DEMO_ID, 'demo', day);
  const attempts = makeHistory(DEMO_ID, content.topics, content.questions, day);
  return { day, learners: [learner], ...content, attempts };
}

/* ------------------------------ state ------------------------------ */

let state = null;
function getState() {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      state = JSON.parse(raw);
      return state;
    }
  } catch { /* ignore */ }
  state = seed();
  save();
  return state;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

/* ------------------------------ views ------------------------------ */

const subjectOf = (s, id) => s.subjects.find((x) => x.id === id);

function conceptView(s, t) {
  const sub = subjectOf(s, t.subject_id);
  const elapsed = s.day - t.last_reviewed_day;
  const retention = Math.exp(-elapsed / t.strength);
  return {
    id: t.id, concept_id: t.id, name: t.name, description: t.description, module: t.module,
    subject_id: t.subject_id, subject_name: sub?.name || '', subject_color: sub?.color || 'indigo',
    difficulty: t.difficulty, strength: round(t.strength), retention: round(retention, 4),
    health: healthOf(retention), elapsed_days: elapsed,
    days_until_review: daysUntilThreshold(t.strength, elapsed, DUE_THRESHOLD),
    reviews: t.reviews, correct: t.correct, accuracy: t.reviews ? round(t.correct / t.reviews, 3) : null,
    question_count: s.questions.filter((q) => q.topic_id === t.id).length,
    last_reviewed_day: t.last_reviewed_day,
  };
}

const learnerTopics = (s, learnerId) => {
  const ids = new Set(s.subjects.filter((x) => x.learner_id === learnerId).map((x) => x.id));
  return s.topics.filter((t) => ids.has(t.subject_id));
};

function subjectView(s, sub) {
  const views = s.topics.filter((t) => t.subject_id === sub.id).map((t) => conceptView(s, t));
  const avg = views.length ? views.reduce((a, v) => a + v.retention, 0) / views.length : 0;
  return {
    ...sub, topic_count: views.length, question_count: views.reduce((a, v) => a + v.question_count, 0),
    avg_retention: round(avg, 4), health: views.length ? healthOf(avg) : 'STABLE',
    due_count: views.filter((v) => v.retention < DUE_THRESHOLD).length,
    critical_count: views.filter((v) => v.health === 'CRITICAL').length,
  };
}

function computeStreak(days, today) {
  const set = new Set(days);
  let cursor = set.has(today) ? today : today - 1;
  let streak = 0;
  while (set.has(cursor)) { streak += 1; cursor -= 1; }
  return streak;
}

function analyticsView(s, learnerId) {
  const topics = learnerTopics(s, learnerId);
  const views = topics.map((t) => conceptView(s, t));
  const topicIds = new Set(topics.map((t) => t.id));
  const attempts = s.attempts.filter((a) => a.learner_id === learnerId && topicIds.has(a.concept_id));
  const total = attempts.length;
  const correct = attempts.filter((a) => a.correct).length;

  const byDay = [];
  for (let d = s.day - 13; d <= s.day; d++) {
    const ofDay = attempts.filter((a) => a.day === d);
    const c = ofDay.filter((a) => a.correct).length;
    byDay.push({ day: d, label: d === s.day ? 'Today' : `D-${s.day - d}`, reviews: ofDay.length, correct: c, incorrect: ofDay.length - c, accuracy: ofDay.length ? round(c / ofDay.length, 3) : null });
  }

  const subjectStats = s.subjects.filter((x) => x.learner_id === learnerId).map((sub) => {
    const subTopics = views.filter((v) => v.subject_id === sub.id);
    const ids = new Set(subTopics.map((v) => v.id));
    const att = attempts.filter((a) => ids.has(a.concept_id));
    const c = att.filter((a) => a.correct).length;
    const avg = subTopics.length ? subTopics.reduce((a, v) => a + v.retention, 0) / subTopics.length : 0;
    return { subject_id: sub.id, name: sub.name, color: sub.color, topics: subTopics.length, reviews: att.length, accuracy: att.length ? round(c / att.length, 3) : 0, avg_retention: round(avg, 4) };
  });

  const recent = [...attempts].reverse().sort((a, b) => b.day - a.day).slice(0, 14).map((a) => {
    const t = s.topics.find((x) => x.id === a.concept_id);
    const q = s.questions.find((x) => x.id === a.question_id);
    return { id: a.id, day: a.day, concept_id: a.concept_id, concept_name: t?.name || 'Unknown', subject_name: subjectOf(s, t?.subject_id)?.name || '', question_text: q?.text || '', correct: a.correct, time_ms: a.time_ms };
  });

  return {
    learner_id: learnerId, current_day: s.day,
    streak: computeStreak(attempts.map((a) => a.day), s.day),
    total_reviews: total, accuracy: total ? round(correct / total, 4) : 0,
    avg_retention: views.length ? round(views.reduce((a, v) => a + v.retention, 0) / views.length, 4) : 0,
    concepts_tracked: views.length, due_today: views.filter((v) => v.retention < DUE_THRESHOLD).length,
    stable_count: views.filter((v) => v.health === 'STABLE').length,
    weak_count: views.filter((v) => v.health === 'WEAK').length,
    critical_count: views.filter((v) => v.health === 'CRITICAL').length,
    reviews_today: attempts.filter((a) => a.day === s.day).length,
    reviews_by_day: byDay, subject_stats: subjectStats, recent_attempts: recent,
  };
}

/* ------------------------------ router ------------------------------ */

const need = (cond, msg) => { if (!cond) throw new Error(msg); };

export async function mockRequest(path, { method = 'GET', params, body } = {}) {
  await new Promise((r) => setTimeout(r, 90 + Math.random() * 110));
  const s = getState();
  const u = new URL(path, 'http://mock.local');
  const q = Object.fromEntries(u.searchParams.entries());
  if (params) Object.entries(params).forEach(([k, v]) => v != null && (q[k] = String(v)));
  const p = u.pathname.replace(/\/+$/, '');
  let m;

  // ---- learners
  if (p === '/api/learners' && method === 'GET') return { learners: s.learners };
  if (p === '/api/learners' && method === 'POST') {
    const name = (body?.name || '').trim();
    const email = (body?.email || '').trim().toLowerCase();
    need(name, 'Name is required.');
    need(!email || !s.learners.some((l) => l.email === email), 'A learner with this email already exists. Try logging in instead.');
    const learner = { id: newId('l'), name, email, goal: body?.goal || '', daily_target: Number(body?.daily_target) || 10, created_day: s.day };
    s.learners.push(learner);
    if (body?.starter_pack) {
      const tag = Math.random().toString(36).slice(2, 6);
      const c = instantiate(learner.id, tag, s.day);
      s.subjects.push(...c.subjects); s.topics.push(...c.topics); s.questions.push(...c.questions);
    }
    save();
    return learner;
  }

  // ---- analytics & concepts
  if (p === '/api/analytics') return analyticsView(s, q.learner_id);
  if (p === '/api/concepts') return { concepts: learnerTopics(s, q.learner_id).map((t) => conceptView(s, t)) };
  if (p === '/api/concepts/weak') {
    const weak = learnerTopics(s, q.learner_id).map((t) => conceptView(s, t)).filter((v) => v.retention < DUE_THRESHOLD).sort((a, b) => a.retention - b.retention);
    return { concepts: weak };
  }

  // ---- scheduling & prediction
  if (p === '/api/schedule/generate' && method === 'POST') {
    const queue = learnerTopics(s, body?.learner_id).map((t) => conceptView(s, t)).filter((v) => v.retention < DUE_THRESHOLD && v.question_count > 0)
      .sort((a, b) => a.retention - b.retention)
      .map((v, i) => ({ ...v, priority: i + 1, est_minutes: Math.max(2, Math.round(Math.min(5, v.question_count) * 0.8)) }));
    return { learner_id: body?.learner_id, day: s.day, total_due: queue.length, queue };
  }
  if (p === '/api/retention/predict' && method === 'POST') {
    const t = s.topics.find((x) => x.id === body?.concept_id);
    need(t, 'Concept not found.');
    const v = conceptView(s, t);
    return {
      concept_id: t.id, current_retention: v.retention, strength: v.strength, elapsed_days: v.elapsed_days,
      days_until_review: v.days_until_review, model: 'Random Forest (simulated by demo backend)',
      curve: buildCurve(t.strength, v.elapsed_days, { accuracy: v.accuracy ?? 0.7, difficulty: DIFFICULTY_SCORE[t.difficulty] || 2 }),
    };
  }

  // ---- subjects & topics
  if (p === '/api/subjects' && method === 'GET') {
    return { subjects: s.subjects.filter((x) => x.learner_id === q.learner_id).map((x) => subjectView(s, x)) };
  }
  if (p === '/api/subjects' && method === 'POST') {
    need((body?.name || '').trim(), 'Subject name is required.');
    const sub = { id: newId('s'), learner_id: body.learner_id, name: body.name.trim(), category: body.category || 'Other', color: body.color || 'indigo', description: body.description || '', created_day: s.day };
    s.subjects.push(sub); save();
    return subjectView(s, sub);
  }
  if ((m = p.match(/^\/api\/subjects\/([^/]+)$/)) && method === 'GET') {
    const sub = subjectOf(s, m[1]);
    need(sub, 'Subject not found.');
    return { ...subjectView(s, sub), topics: s.topics.filter((t) => t.subject_id === sub.id).map((t) => conceptView(s, t)) };
  }
  if ((m = p.match(/^\/api\/subjects\/([^/]+)\/topics$/)) && method === 'POST') {
    const sub = subjectOf(s, m[1]);
    need(sub, 'Subject not found.');
    need((body?.name || '').trim(), 'Topic name is required.');
    // New topics start weak so they show up in the first review queue.
    const t = { id: newId('t'), subject_id: sub.id, name: body.name.trim(), module: (body.module || 'Core').trim() || 'Core', description: body.description || '', difficulty: body.difficulty || 'medium', strength: 2, last_reviewed_day: s.day - 1, reviews: 0, correct: 0, ability: 0.7 };
    s.topics.push(t); save();
    return conceptView(s, t);
  }

  // ---- questions
  if ((m = p.match(/^\/api\/topics\/([^/]+)\/questions$/))) {
    need(s.topics.some((t) => t.id === m[1]), 'Topic not found.');
    if (method === 'GET') return { questions: s.questions.filter((x) => x.topic_id === m[1]) };
    if (method === 'POST') {
      const text = (body?.text ?? body?.question ?? '').trim();
      need(text, 'Question text is required.');
      need(Array.isArray(body?.options) && body.options.length >= 2 && body.options.every((o) => String(o).trim()), 'Provide at least two non-empty options.');
      need(Number.isInteger(body.correct_index) && body.correct_index >= 0 && body.correct_index < body.options.length, 'Select the correct option.');
      const qn = { id: newId('q'), topic_id: m[1], text, options: body.options.map((o) => String(o).trim()), correct_index: body.correct_index, explanation: body.explanation || '', difficulty: body.difficulty || 'medium', created_day: s.day };
      s.questions.push(qn); save();
      return qn;
    }
  }
  if ((m = p.match(/^\/api\/questions\/([^/]+)$/))) {
    const idx = s.questions.findIndex((x) => x.id === m[1]);
    need(idx >= 0, 'Question not found.');
    if (method === 'DELETE') { s.questions.splice(idx, 1); save(); return { deleted: true }; }
    if (method === 'PUT') {
      const text = (body?.text ?? body?.question ?? '').trim();
      need(text, 'Question text is required.');
      s.questions[idx] = { ...s.questions[idx], text, options: body.options, correct_index: body.correct_index, explanation: body.explanation || '', difficulty: body.difficulty || 'medium' };
      save();
      return s.questions[idx];
    }
  }

  // ---- quiz
  if (p === '/api/quiz/questions') {
    const limit = Math.max(1, Number(q.limit) || 5);
    const lastSeen = {};
    s.attempts.filter((a) => a.concept_id === q.concept_id).forEach((a) => { lastSeen[a.question_id] = Math.max(lastSeen[a.question_id] ?? -1, a.day); });
    const pool = s.questions.filter((x) => x.topic_id === q.concept_id).sort(() => Math.random() - 0.5);
    pool.sort((a, b) => (lastSeen[a.id] ?? -1) - (lastSeen[b.id] ?? -1));
    return { questions: pool.slice(0, limit) };
  }
  if (p === '/api/quiz/attempt' && method === 'POST') {
    const t = s.topics.find((x) => x.id === body?.concept_id);
    need(t, 'Concept not found.');
    const question = s.questions.find((x) => x.id === body?.question_id);
    const correct = question ? body.selected_index === question.correct_index : !!body.correct;
    t.strength = correct ? clamp(t.strength * 1.18 + 0.15, 1, 365) : Math.max(1, t.strength * 0.85);
    t.last_reviewed_day = s.day;
    t.reviews += 1;
    if (correct) t.correct += 1;
    s.attempts.push({ id: newId('a'), learner_id: body.learner_id, concept_id: t.id, question_id: body.question_id, correct, time_ms: Number(body.time_ms) || 0, day: s.day });
    save();
    return { correct, correct_index: question?.correct_index, explanation: question?.explanation || '', concept: conceptView(s, t) };
  }

  // ---- simulation & maintenance
  if (p === '/api/day/advance' && method === 'POST') {
    const by = clamp(Math.round(Number(body?.by) || 1), 1, 365);
    s.day += by; save();
    return { day: s.day, advanced_by: by };
  }
  if (p === '/api/reset' && method === 'POST') {
    state = seed(); save();
    return { ok: true, day: state.day };
  }

  throw new Error(`Demo backend: ${method} ${p} is not implemented.`);
}
