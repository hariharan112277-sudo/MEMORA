import { CalendarCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { pct } from '../lib/utils';

const GROUPS = [
  { key: 'overdue', title: 'Overdue', color: '#ef4444' },
  { key: 'today', title: 'Due today', color: '#f59e0b' },
  { key: 'upcoming', title: 'Upcoming', color: '#6366f1' },
];

export default function RevisionSchedule({ limit }) {
  const { schedule, concepts, day, openQuiz } = useApp();

  const sorted = [...schedule].sort((a, b) => (b.overdue - a.overdue) || (b.days_overdue - a.days_overdue) || (a.due_in_days - b.due_in_days));
  const items = limit ? sorted.slice(0, limit) : sorted;
  const groupOf = (i) => (i.overdue ? 'overdue' : i.due_in_days <= 0 ? 'today' : 'upcoming');
  const revise = (i) => openQuiz(concepts.find((c) => c.concept_id === i.concept_id) || { concept_id: i.concept_id, name: i.concept_name, strength: 0 });

  if (!items.length) {
    return (
      <section className="glass grid place-items-center gap-2 p-10 text-center" aria-label="Revision schedule">
        <CalendarCheck className="text-slate-500" aria-hidden />
        <p className="font-semibold text-white">Nothing scheduled</p>
        <p className="muted">Track a concept and its next review will show up here.</p>
      </section>
    );
  }

  return (
    <section className="glass p-5" aria-labelledby="sched-title">
      <h2 id="sched-title" className="section-title mb-4">Revision schedule</h2>
      <div className="space-y-5">
        {GROUPS.map((g) => {
          const rows = items.filter((i) => groupOf(i) === g.key);
          if (!rows.length) return null;
          return (
            <div key={g.key}>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: g.color }}>
                <span className="h-2 w-2 rounded-full" style={{ background: g.color, boxShadow: `0 0 8px ${g.color}` }} aria-hidden />
                {g.title} <span className="text-slate-500">({rows.length})</span>
              </p>
              <ol className="ml-1 space-y-2 border-l border-white/10 pl-4">
                {rows.map((i) => (
                  <li key={i.concept_id} className="relative flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
                    <span aria-hidden className="absolute -left-[21px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full" style={{ background: g.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{i.concept_name}</p>
                      <p className="text-xs text-slate-400">
                        {i.overdue ? <span className="font-semibold text-rose-300">{i.days_overdue}d overdue</span>
                          : i.due_in_days <= 0 ? 'Review today' : `Review in ${i.due_in_days}d (Day ${day + i.due_in_days})`}
                        {' · '}{pct(i.current_retention)}% retained
                      </p>
                    </div>
                    <button className={g.key === 'upcoming' ? 'btn-ghost px-3 py-1.5' : 'btn-primary px-3 py-1.5'} onClick={() => revise(i)}>Revise</button>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </section>
  );
}
