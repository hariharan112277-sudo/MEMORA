import { motion } from 'framer-motion';
import { Play, Trash2, TrendingDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { STATUS, pct, statusOf } from '../lib/utils';

export default function ConceptCard({ concept: c, selected, onChart, onRevise, onDelete }) {
  const { day } = useApp();
  const s = statusOf(c);
  const m = STATUS[s];
  const r = pct(c.retention);
  const ago = day - (c.last_review ?? 0);

  return (
    <article className={`glass p-4 transition ${selected ? 'ring-1 ring-indigo-400/60' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-bold text-white">{c.name}</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Last review: Day {c.last_review ?? 0} ({ago > 0 ? `${ago}d ago` : 'today'})
          </p>
        </div>
        <span className={`chip ${m.chip}`}>{m.label}</span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]" role="progressbar" aria-valuenow={r} aria-valuemin={0} aria-valuemax={100} aria-label={`${c.name} retention`}>
          <motion.div className="h-full rounded-full" style={{ background: m.color, boxShadow: `0 0 12px ${m.color}` }}
            initial={{ width: 0 }} animate={{ width: `${r}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} />
        </div>
        <span className={`w-11 text-right text-sm font-bold tabular-nums ${m.text}`}>{r}%</span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-white/[0.04] px-3 py-2"><dt className="text-slate-400">Memory strength (S)</dt><dd className="mt-0.5 text-sm font-bold tabular-nums text-white">{Number(c.strength).toFixed(1)} days</dd></div>
        <div className="rounded-lg bg-white/[0.04] px-3 py-2"><dt className="text-slate-400">Quiz accuracy</dt><dd className="mt-0.5 text-sm font-bold tabular-nums text-white">{pct(c.rolling_quiz_accuracy)}%</dd></div>
      </dl>

      <div className="mt-3 flex gap-2">
        <button className={`btn-ghost flex-1 ${selected ? 'border-indigo-400/50 text-indigo-200' : ''}`} onClick={() => onChart?.(c)} aria-pressed={!!selected}>
          <TrendingDown size={15} aria-hidden /> Chart
        </button>
        <button className="btn-primary flex-1" onClick={() => onRevise?.(c)}><Play size={15} aria-hidden /> Revise</button>
        {onDelete && <button className="btn-danger px-2.5" onClick={() => onDelete(c)} aria-label={`Delete ${c.name}`}><Trash2 size={15} aria-hidden /></button>}
      </div>
    </article>
  );
}
