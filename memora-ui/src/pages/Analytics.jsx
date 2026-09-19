import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import KpiGrid from '../components/KpiGrid';
import { useApp } from '../context/AppContext';
import { STATUS, pct, statusOf } from '../lib/utils';

const tip = { contentStyle: { background: '#0b0f19', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 } };
const axis = { tick: { fill: '#94a3b8', fontSize: 12 }, tickLine: false, axisLine: false };

export default function Analytics() {
  const { analytics, concepts } = useApp();
  const trend = (analytics?.trend || []).map((t) => ({ day: t.day, retention: pct(t.avg_retention) }));
  const bars = [...concepts].sort((a, b) => a.retention - b.retention).map((c) => ({ name: c.name, retention: pct(c.retention), color: STATUS[statusOf(c)].color }));
  const n = concepts.length || 1;
  const avg = (k) => concepts.reduce((s, c) => s + (Number(c[k]) || 0), 0) / n;
  const facts = [['Average strength', `${avg('strength').toFixed(1)} days`], ['Average quiz accuracy', `${pct(avg('rolling_quiz_accuracy'))}%`], ['Most fragile', bars[0]?.name || '—'], ['Strongest', bars[bars.length - 1]?.name || '—']];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Analytics</h1>
        <p className="muted mt-1">How well memory is holding across days and across concepts.</p>
      </div>
      <KpiGrid />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass p-5">
          <h2 className="section-title">Average retention by day</h2>
          <div className="mt-4 h-72">
            {trend.length < 2 ? <p className="grid h-full place-items-center text-center text-sm text-slate-400">Advance a day to start the trend line.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <defs><linearGradient id="tr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.45} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
                  <XAxis dataKey="day" {...axis} /><YAxis domain={[0, 100]} unit="%" {...axis} />
                  <Tooltip {...tip} labelFormatter={(d) => `Day ${d}`} formatter={(v) => [`${v}%`, 'Average retention']} />
                  <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="5 5" />
                  <Area type="monotone" dataKey="retention" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#tr)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
        <section className="glass p-5">
          <h2 className="section-title">Retention by concept</h2>
          <div className="mt-4 h-72">
            {!bars.length ? <p className="grid h-full place-items-center text-sm text-slate-400">No concepts yet.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bars} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,.06)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} unit="%" {...axis} />
                  <YAxis type="category" dataKey="name" width={110} {...axis} />
                  <Tooltip {...tip} cursor={{ fill: 'rgba(255,255,255,.04)' }} formatter={(v) => [`${v}%`, 'Retention']} />
                  <ReferenceLine x={80} stroke="#f59e0b" strokeDasharray="5 5" />
                  <Bar dataKey="retention" radius={[0, 6, 6, 0]}>{bars.map((b) => <Cell key={b.name} fill={b.color} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {facts.map(([k, v]) => <div key={k} className="glass p-4"><dt className="muted">{k}</dt><dd className="mt-1 truncate text-lg font-bold text-white">{v}</dd></div>)}
      </dl>
    </div>
  );
}
