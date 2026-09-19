import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Cpu, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { STATUS, pct, statusOf } from '../lib/utils';

export default function RetentionChart() {
  const { learnerId, concepts, chartConceptId, setChartConceptId, day } = useApp();
  const concept = concepts.find((c) => c.concept_id === chartConceptId);
  const [pred, setPred] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!learnerId || !chartConceptId) return;
    let live = true;
    setLoading(true);
    api.predictRetention(learnerId, chartConceptId)
      .then((d) => { if (live) { setPred(d); setErr(''); } })
      .catch((e) => live && setErr(e.message))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [learnerId, chartConceptId, day, concept?.strength]);

  const color = STATUS[statusOf(concept || {})].color;
  const curve = pred?.curve || [];
  const below = curve.find((p) => p.retention < 80);
  const method = String(pred?.ml_method || '').replace(/_/g, ' ');

  return (
    <section id="retention-chart" className="glass p-5" aria-labelledby="chart-title">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="chart-title" className="section-title">Forgetting curve</h2>
        {method && (
          <span className="chip bg-violet-500/10 capitalize text-violet-300 ring-violet-500/30"><Cpu size={12} aria-hidden /> {method} model</span>
        )}
        <label className="ml-auto">
          <span className="sr-only">Concept</span>
          <select className="input py-1.5 font-semibold" value={chartConceptId} onChange={(e) => setChartConceptId(e.target.value)}>
            {concepts.map((c) => <option key={c.concept_id} value={c.concept_id}>{c.name}</option>)}
          </select>
        </label>
      </div>

      <p className="muted mt-2">
        {!curve.length ? 'Pick a concept to see how its memory fades.'
          : below ? <>Projected to drop under 80% around <b className="text-white">day {below.day}</b>. Revise before then to keep it stable.</>
          : 'Projected to stay above 80% across the whole window.'}
        {pred?.retention_formula != null && pred?.retention_ml != null && (
          <span className="ml-1 text-slate-500">Formula {pct(pred.retention_formula)}% · ML {pct(pred.retention_ml)}% today.</span>
        )}
      </p>

      <div className="relative mt-4 h-72">
        {loading && <div className="absolute inset-0 z-10 grid place-items-center rounded-xl bg-ink-900/50"><Loader2 className="animate-spin text-indigo-300" aria-label="Loading" /></div>}
        {err ? <p className="grid h-full place-items-center text-sm text-rose-300">{err}</p> : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={curve} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} unit="%" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#0b0f19', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }}
                labelFormatter={(d) => `Day ${d}`} formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Retention']} />
              <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: '80% threshold', fill: '#f59e0b', fontSize: 11, position: 'insideTopRight' }} />
              <Area type="monotone" dataKey="retention" stroke={color} strokeWidth={2.5} fill="url(#curveFill)" isAnimationActive />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
