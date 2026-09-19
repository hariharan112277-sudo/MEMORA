import { RefreshCw } from 'lucide-react';
import RevisionSchedule from '../components/RevisionSchedule';
import { useApp } from '../context/AppContext';

export default function Schedule() {
  const { schedule, overdue, refreshNow, busy, day } = useApp();
  const today = schedule.filter((s) => !s.overdue && s.due_in_days <= 0).length;
  const stats = [['Overdue', overdue, 'text-rose-400'], ['Due today', today, 'text-amber-400'], ['Upcoming', schedule.length - overdue - today, 'text-indigo-300']];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Revision schedule</h1>
          <p className="muted mt-1">Reviews are timed to land just before retention falls under 80%. Today is day {day}.</p>
        </div>
        <button className="btn-ghost" onClick={refreshNow} disabled={busy}><RefreshCw size={15} className={busy ? 'animate-spin' : ''} aria-hidden /> Regenerate</button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {stats.map(([l, v, c]) => (
          <div key={l} className="glass p-4"><p className="muted">{l}</p><p className={`mt-1 text-3xl font-extrabold tabular-nums ${c}`}>{v}</p></div>
        ))}
      </div>
      <RevisionSchedule />
    </div>
  );
}
