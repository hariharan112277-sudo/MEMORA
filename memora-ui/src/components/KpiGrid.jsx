import { ArrowDownRight, ArrowUpRight, CheckCircle2, Gauge, ShieldAlert, TriangleAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { pct } from '../lib/utils';

export default function KpiGrid() {
  const { analytics, concepts } = useApp();
  const counts = analytics?.counts || { stable: 0, weak: 0, critical: 0 };
  const trend = analytics?.trend || [];
  const total = concepts.length || counts.stable + counts.weak + counts.critical || 1;
  const delta = trend.length > 1 ? pct(trend[trend.length - 1].avg_retention) - pct(trend[trend.length - 2].avg_retention) : null;

  const cards = [
    { label: 'Overall retention', value: `${pct(analytics?.overall_retention)}%`, color: '#6366f1', Icon: Gauge, delta },
    { label: 'Stable', value: counts.stable, color: '#10b981', Icon: CheckCircle2, share: counts.stable / total },
    { label: 'Weak', value: counts.weak, color: '#f59e0b', Icon: TriangleAlert, share: counts.weak / total },
    { label: 'Critical', value: counts.critical, color: '#ef4444', Icon: ShieldAlert, share: counts.critical / total },
  ];

  return (
    <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {cards.map(({ label, value, color, Icon, delta: d, share }) => (
        <div key={label} className="glass relative overflow-hidden p-4 sm:p-5">
          <span aria-hidden className="absolute inset-x-6 top-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${color},transparent)`, boxShadow: `0 0 14px 1px ${color}` }} />
          <div className="flex items-center justify-between">
            <p className="muted font-medium">{label}</p>
            <Icon size={18} style={{ color }} aria-hidden />
          </div>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-white sm:text-4xl">{value}</p>
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-400">
            {d != null ? (
              <span className={`flex items-center gap-0.5 ${d >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {d >= 0 ? <ArrowUpRight size={14} aria-hidden /> : <ArrowDownRight size={14} aria-hidden />}{Math.abs(d)} pts
              </span>
            ) : share != null ? (
              <span>{Math.round(share * 100)}% of concepts</span>
            ) : <span>No history yet</span>}
            {d != null && <span>vs previous day</span>}
          </p>
        </div>
      ))}
    </section>
  );
}
