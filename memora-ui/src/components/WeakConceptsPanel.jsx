import { PartyPopper, Siren } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { STATUS, pct, statusOf } from '../lib/utils';

export default function WeakConceptsPanel() {
  const { weak, openQuiz } = useApp();
  const list = [...weak].sort((a, b) => a.retention - b.retention);

  return (
    <section className="glass p-5" aria-labelledby="weak-title">
      <div className="mb-3 flex items-center gap-2">
        <Siren size={18} className="text-rose-400" aria-hidden />
        <h2 id="weak-title" className="section-title">Needs attention</h2>
        {list.length > 0 && <span className="chip ml-auto bg-rose-500/10 text-rose-300 ring-rose-500/30">{list.length}</span>}
      </div>
      {!list.length ? (
        <div className="grid place-items-center gap-2 py-8 text-center">
          <PartyPopper className="text-emerald-400" aria-hidden />
          <p className="font-semibold text-white">Everything is stable</p>
          <p className="muted">No weak or critical concepts right now.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((c) => {
            const m = STATUS[statusOf(c)];
            return (
              <li key={c.concept_id} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3" style={{ borderLeft: `3px solid ${m.color}` }}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{c.name}</p>
                  <p className={`text-xs font-medium ${m.text}`}>{m.label} · {pct(c.retention)}% retained</p>
                </div>
                <button className="btn-primary px-3 py-1.5" onClick={() => openQuiz(c)}>Revise now</button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
