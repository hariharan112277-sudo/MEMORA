import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Clock, Loader2, Trophy, X, XCircle } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

// Set to 1 if your backend numbers options from 1 instead of 0.
const OPTION_BASE = 0;

function Session({ concept, onClose }) {
  const { learnerId, toast } = useApp();
  const [qs, setQs] = useState(null);
  const [err, setErr] = useState('');
  const [i, setI] = useState(0);
  const [sel, setSel] = useState(null);
  const [res, setRes] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const startRef = useRef(Date.now());
  const initial = useRef(Number(concept.strength) || 0);

  useEffect(() => {
    api.quizQuestions(learnerId, concept.concept_id, 5)
      .then((d) => setQs(d.questions || []))
      .catch((e) => setErr(e.message));
  }, [learnerId, concept.concept_id]);

  useEffect(() => {
    if (!qs || res || done) return undefined;
    startRef.current = Date.now();
    setElapsed(0);
    const t = setInterval(() => setElapsed((Date.now() - startRef.current) / 1000), 100);
    return () => clearInterval(t);
  }, [qs, i, res, done]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const q = qs?.[i];

  const pick = async (idx) => {
    if (res || submitting || !q) return;
    setSel(idx);
    setSubmitting(true);
    const rt = Number(((Date.now() - startRef.current) / 1000).toFixed(1));
    try {
      const r = await api.quizAttempt({
        learner_id: learnerId, concept_id: concept.concept_id, question_id: q.id,
        selected_option: idx + OPTION_BASE, response_time: rt,
      });
      setRes(r);
      setAnswers((a) => [...a, { correct: !!r.correct, rt }]);
    } catch (e) {
      toast(e.message, 'error');
      setSel(null);
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (i + 1 >= qs.length) { setDone(true); return; }
    setI(i + 1); setSel(null); setRes(null);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (!done && q && /^[1-9]$/.test(e.key) && Number(e.key) <= q.options.length) pick(Number(e.key) - 1);
      else if (res && !done && (e.key === 'Enter' || e.key === 'ArrowRight')) next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const score = answers.filter((a) => a.correct).length;
  const optionStyle = (idx) => {
    if (!res) return sel === idx ? 'border-indigo-400 bg-indigo-500/15' : 'border-white/10 bg-white/[0.04] hover:border-indigo-400/60 hover:bg-white/[0.08]';
    if (idx + OPTION_BASE === res.correct_option) return 'border-emerald-400 bg-emerald-500/15';
    if (idx === sel) return 'border-rose-400 bg-rose-500/15';
    return 'border-white/5 bg-white/[0.02] opacity-50';
  };

  return (
    <div className="flex max-h-[90vh] flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-white/[0.08] px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{concept.name}</p>
          {qs && !done && <p className="text-xs text-slate-400">Question {i + 1} of {qs.length}</p>}
        </div>
        {qs && !done && (
          <span className="chip bg-white/5 tabular-nums text-slate-200 ring-white/10" aria-label="Response time">
            <Clock size={12} aria-hidden /> {(res ? answers[answers.length - 1]?.rt : elapsed).toFixed(1)}s
          </span>
        )}
        <button onClick={onClose} aria-label="Close quiz" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"><X size={18} /></button>
      </div>

      <div className="overflow-y-auto p-5">
        {err && <p className="py-10 text-center text-rose-300">{err}</p>}
        {!err && !qs && <div className="grid place-items-center py-16"><Loader2 className="animate-spin text-indigo-300" aria-label="Loading questions" /></div>}
        {qs && !qs.length && <p className="py-10 text-center text-slate-300">No quiz questions are available for this concept yet.</p>}

        {q && !done && (
          <>
            <div className="mb-5 flex gap-1.5" aria-hidden>
              {qs.map((_, n) => <span key={n} className="h-1.5 flex-1 rounded-full" style={{ background: n < answers.length ? (answers[n].correct ? '#10b981' : '#ef4444') : n === i ? '#6366f1' : 'rgba(255,255,255,.1)' }} />)}
            </div>
            <h3 className="text-lg font-bold leading-snug text-white">{q.text}</h3>
            <div className="mt-4 grid gap-2.5" role="group" aria-label="Answer options">
              {q.options.map((o, idx) => (
                <button key={idx} disabled={!!res || submitting} onClick={() => pick(idx)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium text-slate-100 transition ${optionStyle(idx)}`}>
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/10 text-xs font-bold">{idx + 1}</span>
                  <span className="flex-1">{o}</span>
                  {res && idx + OPTION_BASE === res.correct_option && <CheckCircle2 size={18} className="text-emerald-400" aria-label="Correct answer" />}
                  {res && idx === sel && !res.correct && <XCircle size={18} className="text-rose-400" aria-label="Your answer" />}
                </button>
              ))}
            </div>
            {res && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl bg-white/[0.05] p-4 text-sm">
                <p className={`font-bold ${res.correct ? 'text-emerald-400' : 'text-rose-400'}`}>{res.correct ? 'Correct' : 'Not quite'}</p>
                {res.explanation && <p className="mt-1 text-slate-300">{res.explanation}</p>}
                <button className="btn-primary mt-3" onClick={next}>{i + 1 >= qs.length ? 'See results' : 'Next question'} <ArrowRight size={15} aria-hidden /></button>
              </motion.div>
            )}
          </>
        )}

        {done && (
          <div className="py-4 text-center">
            <Trophy className="mx-auto text-amber-400" size={40} aria-hidden />
            <p className="mt-3 text-4xl font-extrabold tabular-nums text-white">{score}/{qs.length}</p>
            <p className="muted mt-1">{score === qs.length ? 'Perfect recall.' : score >= qs.length / 2 ? 'Solid session.' : 'Keep at it. Short, frequent reviews work best.'}</p>
            <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/[0.05] p-4">
                <p className="text-xs text-slate-400">Memory strength</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-white">{initial.current.toFixed(1)} → <span className="text-emerald-400">{Number(res?.new_strength ?? initial.current).toFixed(1)}</span></p>
              </div>
              <div className="rounded-xl bg-white/[0.05] p-4">
                <p className="text-xs text-slate-400">Next review</p>
                <p className="mt-1 text-lg font-bold text-white">{res?.next_review_estimate_days != null ? `in ${res.next_review_estimate_days} day${res.next_review_estimate_days === 1 ? '' : 's'}` : 'Scheduled'}</p>
              </div>
            </div>
            <button className="btn-primary mt-6" onClick={onClose}>Back to dashboard</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuizModal() {
  const { quizConcept, closeQuiz } = useApp();
  return (
    <AnimatePresence>
      {quizConcept && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && closeQuiz()}>
          <motion.div role="dialog" aria-modal="true" aria-label={`Quiz: ${quizConcept.name}`}
            className="glass w-full max-w-xl bg-ink-900 shadow-2xl" style={{ background: 'rgba(11,15,25,.96)' }}
            initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0 }}>
            <Session key={quizConcept.concept_id} concept={quizConcept} onClose={closeQuiz} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
