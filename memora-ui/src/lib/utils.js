export const pct = (v) => Math.round((Number(v) || 0) * 100);

export const STATUS = {
  stable:   { label: 'Stable',   color: '#10b981', text: 'text-emerald-400', chip: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30' },
  weak:     { label: 'Weak',     color: '#f59e0b', text: 'text-amber-400',   chip: 'bg-amber-500/10 text-amber-300 ring-amber-500/30' },
  critical: { label: 'Critical', color: '#ef4444', text: 'text-rose-400',    chip: 'bg-rose-500/10 text-rose-300 ring-rose-500/30' },
};

export const statusOf = (c) => {
  const s = String(c?.status || '').toLowerCase();
  if (STATUS[s]) return s;
  const r = Number(c?.retention) || 0;
  return r >= 0.8 ? 'stable' : r >= 0.5 ? 'weak' : 'critical';
};
