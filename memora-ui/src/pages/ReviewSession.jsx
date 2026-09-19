import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, ListChecks, RotateCcw, X } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { asList, dueLabel, fmtDays, fmtSeconds, normalizeConcepts, normalizeQuestion, pct } from '../utils/memory';
import Logo from '../components/Logo';
import { Button, EmptyState, ErrorState, GlassCard, HealthBadge, Spinner, cx } from '../components/ui';

const QUIZ_LENGTH = 5;
const TARGET_SECONDS = 30; // soft per-question target shown by the timer ring
const LETTERS = ['A', 'B', 'C', 'D'];

function TimerRing({ seconds }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const frac = Math.min(seconds / TARGET_SECONDS, 1);
  const over = seconds > TARGET_SECONDS;
  return (
    <div className="flex items-center gap-2.5" role="timer" aria-label={`Elapsed ${Math.floor(seconds)} seconds`}>
      <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
        <circle cx="22" cy="22" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={over ? '#f59e0b' : '#4f46e5'} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform="rotate(-90 22 22)" />
      </svg>
      <span className="num w-12 text-lg font-extrabold text-obsidian">{Math.floor(seconds / 60)}:{String(Math.floor(seconds % 60)).padStart(2, '0')}</span>
    </div>
  );
}

function ScoreRing({ score, total }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const frac = total ? score / total : 0;
  const color = frac >= 0.8 ? '#10b981' : frac >= 0.5 ? '#f59e0b' : '#f43f5e';
  return (
    <div className="relative grid h-36 w-36 place-items-center">
      <svg width="144" height="144" viewBox="0 0 144 144" className="absolute inset-0" aria-hidden>
        <circle cx="72" cy="72" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle cx="72" cy="72" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform="rotate(-90 72 72)" />
      </svg>
      <div className="text-center">
        <p className="num text-4xl font-extrabold text-obsidian">{score}<span className="text-xl text-slate-400">/{total}</span></p>
        <p className="text-xs font-semibold text-slate-500">correct</p>
      </div>
    </div>
  );
}

export default function ReviewSession() {
  const { topicId } = useParams();
  const { learner, toast, refresh } = useApp();
  const navigate = useNavigate();
  const lid = learner.id;

  const [status, setStatus] = useState('loading'); // loading | error | empty | quiz | summary
  const [error, setError] = useState(null);
  const [concept, setConcept] = useState(null); // state before the session
  const [after, setAfter] = useState(null); // state after the session
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null); // { correct, correct_index, explanation }
  const [answers, setAnswers] = useState([]);
  const [seconds, setSeconds] = useState(0);
  const [round, setRound] = useState(0);
  const startRef = useRef(Date.now());
  const busyRef = useRef(false);
  const pendingRef = useRef(Promise.resolve());

  // Load concept + questions (again whenever the round changes).
  useEffect(() => {
    let alive = true;
    setStatus('loading');
    setIdx(0); setSelected(null); setResult(null); setAnswers([]); setAfter(null);
    (async () => {
      try {
        const [conceptsRes, quizRes] = await Promise.all([api.getConcepts(lid), api.getQuizQuestions(lid, topicId, QUIZ_LENGTH)]);
        if (!alive) return;
        const c = normalizeConcepts(conceptsRes).find((x) => String(x.id) === String(topicId));
        if (!c) throw new Error('This topic could not be found.');
        const qs = asList(quizRes, 'questions').map(normalizeQuestion);
        setConcept(c);
        setQuestions(qs);
        startRef.current = Date.now();
        setSeconds(0);
        setStatus(qs.length ? 'quiz' : 'empty');
      } catch (e) {
        if (alive) { setError(e); setStatus('error'); }
      }
    })();
    return () => { alive = false; };
  }, [lid, topicId, round]);

  // Per-question timer
  useEffect(() => {
    if (status !== 'quiz' || result) return undefined;
    const t = setInterval(() => setSeconds((Date.now() - startRef.current) / 1000), 200);
    return () => clearInterval(t);
  }, [status, result, idx]);

  const q = questions[idx];

  const choose = useCallback(async (i) => {
    if (!q || result || busyRef.current) return;
    const timeMs = Date.now() - startRef.current;
    // Instant feedback when the API includes the answer key; otherwise wait for the server verdict.
    const local = typeof q.correct_index === 'number';
    const localCorrect = local && i === q.correct_index;
    if (!local) busyRef.current = true;
    setSelected(i);
    if (local) {
      setResult({ correct: localCorrect, correct_index: q.correct_index, explanation: q.explanation });
      setAnswers((a) => [...a, { correct: localCorrect, timeMs }]);
    }
    const call = api.submitQuizAttempt({
      learner_id: lid, concept_id: topicId, question_id: q.id, selected_option: i, selected_index: i,
      correct: local ? localCorrect : undefined, response_time: timeMs / 1000, time_ms: timeMs,
    });
    pendingRef.current = call.catch(() => {});
    try {
      const res = await call;
      if (!local) {
        const correct = !!res.correct;
        setResult({ correct, correct_index: res.correct_index, explanation: q.explanation || res.explanation || '' });
        setAnswers((a) => [...a, { correct, timeMs }]);
      }
    } catch (e) {
      toast(e.message, 'error');
      if (local) setAnswers((a) => a.slice(0, -1));
      setSelected(null);
      setResult(null);
    } finally {
      busyRef.current = false;
    }
  }, [q, result, lid, topicId, toast]);

  const next = useCallback(async () => {
    if (!result) return;
    if (idx + 1 < questions.length) {
      setIdx(idx + 1); setSelected(null); setResult(null);
      startRef.current = Date.now(); setSeconds(0);
      return;
    }
    // Finished: fetch the updated concept to show the memory strength change.
    setStatus('summary');
    refresh();
    try {
      await pendingRef.current; // make sure the last attempt has been recorded
      const fresh = normalizeConcepts(await api.getConcepts(lid)).find((x) => String(x.id) === String(topicId));
      setAfter(fresh || null);
    } catch { /* summary still renders without the after-state */ }
  }, [result, idx, questions.length, lid, topicId, refresh]);

  // Keyboard: 1-4 to answer, Enter/Space to continue, Esc to leave.
  useEffect(() => {
    if (status !== 'quiz') return undefined;
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (['1', '2', '3', '4'].includes(e.key) && !result) choose(Number(e.key) - 1);
      else if ((e.key === 'Enter' || e.key === ' ') && result) { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, result, choose, next]);

  const score = answers.filter((a) => a.correct).length;
  const avgMs = answers.length ? answers.reduce((a, b) => a + b.timeMs, 0) / answers.length : 0;
  const leave = () => navigate(concept?.subject_id ? `/subjects/${concept.subject_id}` : '/dashboard');
  const progress = useMemo(() => (questions.length ? (idx + (result ? 1 : 0)) / questions.length : 0), [idx, result, questions.length]);

  const shell = (children) => (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/dashboard" aria-label="Memora home"><Logo /></Link>
        <Button variant="ghost" size="sm" onClick={leave}><X className="h-3.5 w-3.5" aria-hidden /> Exit review</Button>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">{children}</main>
    </div>
  );

  if (status === 'loading') return shell(<Spinner label="Preparing your review" />);
  if (status === 'error') return shell(<ErrorState error={error} onRetry={() => setRound((r) => r + 1)} />);
  if (status === 'empty') {
    return shell(
      <EmptyState
        icon={ListChecks} title="No questions for this topic yet" body={`Add a few questions to “${concept?.name}” and come back to review it.`}
        action={<Button variant="dark" to={`/subjects/${concept?.subject_id}/topics/${concept?.id}/questions`}>Open Question Studio</Button>}
      />
    );
  }

  if (status === 'summary') {
    const gained = after ? after.strength - concept.strength : 0;
    const pctCorrect = answers.length ? score / answers.length : 0;
    const verdict = pctCorrect >= 0.8 ? 'Strong recall. This memory just got a lot more durable.' : pctCorrect >= 0.5 ? 'Decent recall. A few more reviews will lock this in.' : 'This one is still shaky. Memora will bring it back sooner.';
    return shell(
      <div className="animate-pop space-y-5">
        <GlassCard className="flex flex-col items-center p-8 text-center shadow-lift">
          <ScoreRing score={score} total={answers.length} />
          <h1 className="mt-5 text-2xl font-extrabold">{concept.name}</h1>
          <p className="mt-1.5 max-w-md text-sm text-slate-500">{verdict}</p>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="mb-4 text-base font-bold">Memory strength</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500">Strength (S)</p>
              <p className="num mt-1.5 text-xl font-extrabold text-obsidian">
                {fmtDays(concept.strength)} <span className="mx-1 text-slate-400">to</span> {after ? fmtDays(after.strength) : '…'}
              </p>
              {after && <p className={cx('num mt-1 text-xs font-bold', gained >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{gained >= 0 ? '+' : ''}{gained.toFixed(1)} days</p>}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500">Retention</p>
              <p className="num mt-1.5 text-xl font-extrabold text-obsidian">{pct(concept.retention)} <span className="mx-1 text-slate-400">to</span> {after ? pct(after.retention) : '…'}</p>
              {after && <div className="mt-1.5"><HealthBadge retention={after.retention} health={after.health} /></div>}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500">Next review</p>
              <p className="mt-1.5 text-xl font-extrabold text-obsidian">{after ? dueLabel(after.days_until_review) : '…'}</p>
              <p className="num mt-1 text-xs text-slate-500">Avg answer time {fmtSeconds(avgMs)}</p>
            </div>
          </div>
        </GlassCard>

        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="dark" to="/dashboard">Back to dashboard</Button>
          <Button variant="ghost" onClick={() => setRound((r) => r + 1)}><RotateCcw className="h-4 w-4" aria-hidden /> Review again</Button>
        </div>
      </div>
    );
  }

  const last = idx + 1 === questions.length;
  return shell(
    <div className="space-y-5">
      <GlassCard className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-500">{concept.subject_name}</p>
            <h1 className="truncate text-lg font-extrabold">{concept.name}</h1>
          </div>
          <TimerRing seconds={seconds} />
        </div>
        <div className="mt-4 flex items-center gap-2" aria-label={`Question ${idx + 1} of ${questions.length}`}>
          {questions.map((_, i) => {
            const a = answers[i];
            return <span key={i} className={cx('h-2 flex-1 rounded-full transition-colors', a ? (a.correct ? 'bg-emerald-500' : 'bg-rose-400') : i === idx ? 'bg-indigo-500' : 'bg-slate-200')} />;
          })}
        </div>
        <p className="num mt-2 text-xs font-semibold text-slate-500">Question {idx + 1} of {questions.length}</p>
        <span className="sr-only" aria-live="polite">{Math.round(progress * 100)} percent complete</span>
      </GlassCard>

      <GlassCard className="p-6 sm:p-8">
        <h2 className="text-xl font-bold leading-snug sm:text-2xl">{q.text}</h2>

        <div className="mt-6 grid gap-3" role="group" aria-label="Answer options">
          {q.options.map((opt, i) => {
            const isCorrect = result && i === result.correct_index;
            const isWrongPick = result && selected === i && !result.correct;
            return (
              <button
                key={i} onClick={() => choose(i)} disabled={!!result} aria-pressed={selected === i}
                className={cx(
                  'flex w-full items-center gap-4 rounded-2xl border-2 bg-white px-4 py-3.5 text-left transition-all disabled:cursor-default',
                  !result && 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40',
                  isCorrect && 'border-emerald-400 bg-emerald-50 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]',
                  isWrongPick && 'border-rose-400 bg-rose-50 shadow-[0_0_0_4px_rgba(244,63,94,0.15)]',
                  result && !isCorrect && !isWrongPick && 'border-slate-200 opacity-60'
                )}
              >
                <span className={cx('num grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-extrabold', isCorrect ? 'bg-emerald-500 text-white' : isWrongPick ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600')}>
                  {isCorrect ? <Check className="h-4 w-4" aria-hidden /> : isWrongPick ? <X className="h-4 w-4" aria-hidden /> : i + 1}
                </span>
                <span className="flex-1 text-[15px] font-medium text-slate-800"><span className="sr-only">Option {LETTERS[i]}: </span>{opt}</span>
              </button>
            );
          })}
        </div>

        {result && (
          <div className={cx('mt-6 animate-pop rounded-2xl border p-4', result.correct ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70')} role="status">
            <p className={cx('text-sm font-extrabold', result.correct ? 'text-emerald-800' : 'text-rose-800')}>{result.correct ? 'Correct' : `Not quite. The answer is ${LETTERS[result.correct_index]}.`}</p>
            {result.explanation && <p className="mt-1 text-sm leading-relaxed text-slate-700">{result.explanation}</p>}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="hidden text-xs text-slate-400 sm:block">Press 1 to 4 to answer, Enter to continue</p>
          <Button variant="indigo" className="ml-auto" onClick={next} disabled={!result}>
            {last ? 'Finish review' : 'Next question'} <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
