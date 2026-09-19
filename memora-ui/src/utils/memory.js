// Memory-science helpers shared by every page.
// Retention (R) is always handled as a fraction 0..1 internally.

export const HEALTH_THRESHOLDS = { STABLE: 0.8, WEAK: 0.5 };

export const toFrac = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  return n > 1 ? Math.min(n / 100, 1) : n;
};

export const healthOf = (r) => {
  const f = toFrac(r);
  if (f >= HEALTH_THRESHOLDS.STABLE) return 'STABLE';
  if (f >= HEALTH_THRESHOLDS.WEAK) return 'WEAK';
  return 'CRITICAL';
};

export const pct = (r, digits = 0) => `${(toFrac(r) * 100).toFixed(digits)}%`;

export const DIFFICULTY_SCORE = { easy: 1, medium: 2, hard: 3 };

/** Classic Ebbinghaus forgetting curve: R = e^(-t/S) */
export const baselineRetention = (S, t) => Math.exp(-t / Math.max(Number(S) || 1, 0.1));

/**
 * Client-side approximation of the backend's Random Forest retention model.
 * Used only when the API does not return a projected curve itself.
 * It bends the exponential curve using the learner's recall accuracy and topic difficulty.
 */
export const rfRetention = (S, t, accuracy = 0.7, difficulty = 2) => {
  const k = 0.9 + 0.35 * accuracy - 0.05 * (difficulty - 2);
  const eff = Math.max(Number(S) || 1, 0.1) * k;
  return Math.exp(-Math.pow(Math.max(t, 0) / eff, 0.92));
};

/** Build a projected decay curve (percent values) for the next `horizon` days. */
export const buildCurve = (S, elapsed = 0, { accuracy = 0.7, difficulty = 2, horizon = 30 } = {}) =>
  Array.from({ length: horizon + 1 }, (_, day) => ({
    day,
    rf: +(rfRetention(S, elapsed + day, accuracy, difficulty) * 100).toFixed(1),
    baseline: +(baselineRetention(S, elapsed + day) * 100).toFixed(1),
  }));

/** Days until retention falls below the given threshold (0 or negative = overdue). */
export const daysUntilThreshold = (S, elapsed = 0, threshold = HEALTH_THRESHOLDS.STABLE) =>
  Math.ceil(-Math.max(Number(S) || 1, 0.1) * Math.log(threshold) - elapsed);

export const dueLabel = (days) => {
  if (days == null || Number.isNaN(days)) return '—';
  if (days <= 0) return days === 0 ? 'Due today' : `${Math.abs(days)}d overdue`;
  return `Due in ${days}d`;
};

export const fmtDays = (S) => {
  const n = Number(S) || 0;
  return n >= 10 ? `${Math.round(n)}d` : `${n.toFixed(1)}d`;
};

export const fmtSeconds = (ms) => `${(ms / 1000).toFixed(1)}s`;

/** Accepts arrays or common wrapper shapes: { items }, { data }, { concepts }, ... */
export function asList(res, ...keys) {
  if (Array.isArray(res)) return res;
  if (!res || typeof res !== 'object') return [];
  for (const k of [...keys, 'items', 'data', 'results']) {
    if (Array.isArray(res[k])) return res[k];
  }
  return [];
}

/** Fill in defaults so every page can rely on the same concept shape. */
export function normalizeConcept(c = {}) {
  const retention = toFrac(c.retention ?? c.current_retention ?? c.predicted_retention ?? 0);
  const strength = Number(c.strength ?? c.memory_strength ?? c.S ?? 1) || 1;
  const elapsed =
    c.elapsed_days ?? (retention > 0 && retention < 1 ? -strength * Math.log(retention) : retention >= 1 ? 0 : strength * 4);
  const accuracy = c.accuracy != null ? toFrac(c.accuracy) : c.reviews ? toFrac((c.correct || 0) / c.reviews) : 0.7;
  const rawId = c.id ?? c.concept_id ?? c.topic_id;
  const rawName = c.name ?? c.title ?? c.concept_name ?? c.topic_name;
  const name = rawName || (rawId ? String(rawId).replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : 'Concept');
  return {
    ...c,
    id: rawId,
    name,
    subject_id: c.subject_id,
    subject_name: c.subject_name ?? c.subject ?? '',
    retention,
    strength,
    elapsed_days: elapsed,
    accuracy,
    health: c.health ?? healthOf(retention),
    difficulty: c.difficulty ?? 'medium',
    days_until_review: c.days_until_review ?? daysUntilThreshold(strength, elapsed),
    reviews: c.reviews ?? 0,
    question_count: c.question_count ?? c.questions ?? 0,
  };
}

export const normalizeConcepts = (res, ...keys) => asList(res, ...keys, 'concepts', 'topics', 'queue').map(normalizeConcept);

export function normalizeQuestion(q = {}) {
  const options = q.options ?? q.choices ?? [];
  let correct = q.correct_index ?? q.correctIndex ?? q.answer_index;
  if (correct == null && typeof q.correct_answer === 'string') correct = options.indexOf(q.correct_answer);
  return {
    ...q,
    id: q.id ?? q.question_id,
    text: q.text ?? q.question ?? q.prompt ?? '',
    options,
    correct_index: typeof correct === 'number' && correct >= 0 ? correct : undefined,
    explanation: q.explanation ?? '',
    difficulty: q.difficulty ?? 'medium',
  };
}

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};
