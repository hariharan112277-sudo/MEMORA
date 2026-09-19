import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

const AXIS = { stroke: '#e2e8f0', tickLine: false };

function TooltipCard({ active, payload, label, labelFormatter, valueSuffix = '%' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lift">
      <p className="mb-1 font-bold text-slate-800">{labelFormatter ? labelFormatter(label) : label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.stroke }} />
          <span>{p.name}</span>
          <span className="num ml-auto pl-4 font-bold text-slate-900">
            {typeof p.value === 'number' ? p.value.toFixed(p.value % 1 ? 1 : 0) : p.value}
            {valueSuffix}
          </span>
        </p>
      ))}
    </div>
  );
}

/** Single-concept forgetting curve: RF prediction vs classic Ebbinghaus baseline. */
export function DecayChart({ curve, height = 300 }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={curve} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="rfFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="day" {...AXIS} tickFormatter={(d) => (d === 0 ? 'Now' : `+${d}d`)} interval="preserveStartEnd" minTickGap={24} />
          <YAxis {...AXIS} axisLine={false} domain={[0, 100]} ticks={[0, 25, 50, 80, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip content={<TooltipCard labelFormatter={(d) => (d === 0 ? 'Today' : `In ${d} days`)} />} />
          <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Stable', position: 'insideTopRight', fill: '#059669', fontSize: 10, fontWeight: 700 }} />
          <ReferenceLine y={50} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: 'Critical', position: 'insideTopRight', fill: '#e11d48', fontSize: 10, fontWeight: 700 }} />
          <Area type="monotone" dataKey="rf" name="Random Forest" stroke="#4f46e5" strokeWidth={2.5} fill="url(#rfFill)" dot={false} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="baseline" name="Ebbinghaus baseline" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Multi-subject projected retention. `series` = [{ key, name, color }]; `showBaseline` draws dashed Ebbinghaus lines. */
export function SubjectDecayChart({ data, series, showBaseline, height = 320 }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="day" {...AXIS} tickFormatter={(d) => (d === 0 ? 'Now' : `+${d}d`)} interval="preserveStartEnd" minTickGap={24} />
          <YAxis {...AXIS} axisLine={false} domain={[0, 100]} ticks={[0, 25, 50, 80, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip content={<TooltipCard labelFormatter={(d) => (d === 0 ? 'Today' : `In ${d} days`)} />} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 4" />
          <ReferenceLine y={50} stroke="#f43f5e" strokeDasharray="4 4" />
          {series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={`${s.name} (RF)`} stroke={s.color} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
          ))}
          {showBaseline &&
            series.map((s) => (
              <Line key={`${s.key}_base`} type="monotone" dataKey={`${s.key}_base`} name={`${s.name} (Ebbinghaus)`} stroke={s.color} strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray="4 4" dot={false} legendType="none" />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReviewsBarChart({ data, height = 260 }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, left: -22, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="label" {...AXIS} interval={1} />
          <YAxis {...AXIS} axisLine={false} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'rgba(99,102,241,0.06)' }} content={<TooltipCard valueSuffix="" />} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="correct" name="Correct" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
          <Bar dataKey="incorrect" name="Incorrect" stackId="a" fill="#fb7185" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
