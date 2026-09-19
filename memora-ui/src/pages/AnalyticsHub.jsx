import { useMemo, useState } from 'react';
import { Activity, BarChart3, Flame, Gauge, Target } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { useAsync } from '../hooks/useAsync';
import { baselineRetention, DIFFICULTY_SCORE, fmtSeconds, healthOf, normalizeConcepts, pct, rfRetention } from '../utils/memory';
import { CHART_COLORS, HEALTH_HEX } from '../utils/theme';
import { ReviewsBarChart, SubjectDecayChart } from '../components/charts';
import { EmptyState, ErrorState, GlassCard, KpiCard, ProgressBar, SectionTitle, Spinner, cx } from '../components/ui';

const HEATMAP_DAYS = 14;

function Heatmap({ concepts }) {
  const rows = useMemo(
    () =>
      [...concepts]
        .sort((a, b) => (a.subject_name || '').localeCompare(b.subject_name || '') || a.retention - b.retention)
        .map((c) => ({
          c,
          cells: Array.from({ length: HEATMAP_DAYS }, (_, d) => rfRetention(c.strength, c.elapsed_days + d, c.accuracy, DIFFICULTY_SCORE[c.difficulty] || 2)),
        })),
    [concepts]
  );

  return (
    <div>
      <div className="thin-scroll overflow-x-auto pb-2">
        <table className="w-full min-w-[720px] border-separate border-spacing-[3px] text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-44 bg-white/90 pr-2 text-left font-semibold text-slate-500 backdrop-blur">Concept</th>
              {Array.from({ length: HEATMAP_DAYS }, (_, d) => (
                <th key={d} className="num px-0.5 text-center font-semibold text-slate-500">{d === 0 ? 'Now' : `+${d}d`}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, cells }) => (
              <tr key={c.id}>
                <th scope="row" className="sticky left-0 z-10 max-w-[11rem] truncate bg-white/90 pr-2 text-left text-xs font-semibold text-slate-700 backdrop-blur" title={`${c.name} (${c.subject_name})`}>{c.name}</th>
                {cells.map((r, d) => {
                  const h = healthOf(r);
                  return (
                    <td key={d} className="p-0" title={`${c.name}: ${pct(r)} in ${d} day${d === 1 ? '' : 's'}`}>
                      <div className="num grid h-8 place-items-center rounded-md text-[10px] font-bold text-white" style={{ background: HEALTH_HEX[h], opacity: 0.35 + 0.65 * r }}>
                        {Math.round(r * 100)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500">
        {[['Stable, 80% or more', 'STABLE'], ['Weak, 50 to 79%', 'WEAK'], ['Critical, under 50%', 'CRITICAL']].map(([l, h]) => (
          <span key={h} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ background: HEALTH_HEX[h] }} />{l}</span>
        ))}
        <span>Values are projected retention if you do not review.</span>
      </div>
    </div>
  );
}

export default function AnalyticsHub() {
  const { learner, version } = useApp();
  const lid = learner?.id;
  const [showBaseline, setShowBaseline] = useState(false);

  const { data, loading, error, reload } = useAsync(async () => {
    if (!lid) return null;
    const [analytics, concepts] = await Promise.all([api.getAnalytics(lid), api.getConcepts(lid)]);
    return { analytics: analytics || {}, concepts: normalizeConcepts(concepts) };
  }, [lid, version]);

  const concepts = data?.concepts;

  // Average projected retention per subject, Random Forest vs Ebbinghaus baseline.
  const { curveData, series } = useMemo(() => {
    if (!concepts?.length) return { curveData: [], series: [] };
    const groups = new Map();
    concepts.forEach((c) => { const k = c.subject_name || 'Other'; groups.set(k, [...(groups.get(k) || []), c]); });
    const list = [...groups.entries()].map(([name, items], i) => ({ key: `s${i}`, name, color: CHART_COLORS[i % CHART_COLORS.length], items }));
    const rows = Array.from({ length: 31 }, (_, day) => {
      const row = { day };
      list.forEach((s) => {
        const rf = s.items.reduce((a, c) => a + rfRetention(c.strength, c.elapsed_days + day, c.accuracy, DIFFICULTY_SCORE[c.difficulty] || 2), 0) / s.items.length;
        const base = s.items.reduce((a, c) => a + baselineRetention(c.strength, c.elapsed_days + day), 0) / s.items.length;
        row[s.key] = +(rf * 100).toFixed(1);
        row[`${s.key}_base`] = +(base * 100).toFixed(1);
      });
      return row;
    });
    return { curveData: rows, series: list.map(({ key, name, color }) => ({ key, name, color })) };
  }, [concepts]);

  if (!learner || (loading && !data)) return <Spinner label="Crunching your analytics" />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const a = data?.analytics || {};
  if (!concepts.length) {
    return (
      <>
        <h1 className="mb-7 text-3xl font-extrabold">Analytics</h1>
        <EmptyState icon={BarChart3} title="Nothing to analyze yet" body="Add subjects and complete a few reviews to see retention heatmaps, streaks and decay curves." />
      </>
    );
  }

  const daysAgo = (d) => (a.current_day == null ? `Day ${d}` : a.current_day === d ? 'Today' : `${a.current_day - d}d ago`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold sm:text-[2rem]">Analytics</h1>
        <p className="mt-1.5 text-sm text-slate-500">How well you remember, how consistently you study, and where memories are fading.</p>
      </div>

      <section aria-label="Summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Study streak" value={`${a.streak ?? 0} day${a.streak === 1 ? '' : 's'}`} hint="Consecutive days with a review" icon={Flame} tone="amber" />
        <KpiCard label="Total reviews" value={a.total_reviews ?? 0} hint={`${a.reviews_today ?? 0} today`} icon={Activity} tone="sky" />
        <KpiCard label="Recall accuracy" value={pct(a.accuracy ?? 0)} hint="Across all reviews" icon={Target} tone="emerald" />
        <KpiCard label="Average retention" value={pct(a.avg_retention ?? 0)} hint={`${a.critical_count ?? 0} critical, ${a.weak_count ?? 0} weak`} icon={Gauge} tone="indigo" />
      </section>

      <GlassCard className="p-5 sm:p-6">
        <SectionTitle
          title="Decay curves by subject"
          hint="Projected average retention over 30 days. Solid lines are the Random Forest model."
          action={
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
              <input type="checkbox" checked={showBaseline} onChange={(e) => setShowBaseline(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
              Compare with Ebbinghaus
            </label>
          }
        />
        <SubjectDecayChart data={curveData} series={series} showBaseline={showBaseline} />
      </GlassCard>

      <GlassCard className="p-5 sm:p-6">
        <SectionTitle title="Retention heatmap" hint="Each row is a concept. Each column is a day from now." />
        <Heatmap concepts={concepts} />
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-5">
        <GlassCard className="p-5 sm:p-6 lg:col-span-3">
          <SectionTitle title="Reviews in the last 14 days" hint="Correct and incorrect answers per day" />
          <ReviewsBarChart data={a.reviews_by_day || []} />
        </GlassCard>

        <GlassCard className="p-5 sm:p-6 lg:col-span-2">
          <SectionTitle title="Accuracy by subject" />
          <ul className="space-y-5">
            {(a.subject_stats || []).map((s, i) => (
              <li key={s.subject_id ?? s.name}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-800"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} /><span className="truncate">{s.name}</span></span>
                  <span className="num font-extrabold text-obsidian">{s.reviews ? pct(s.accuracy) : 'No reviews'}</span>
                </div>
                <ProgressBar value={s.accuracy} tone="bg-indigo-500" label={`${s.name} accuracy`} />
                <p className="num mt-1.5 text-xs text-slate-500">{s.reviews} reviews, {pct(s.avg_retention)} avg retention</p>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>

      <GlassCard className="p-5 sm:p-6">
        <SectionTitle title="Recall accuracy log" hint="Your most recent answers" />
        {(a.recent_attempts || []).length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Answers will appear here after your first review.</p>
        ) : (
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="pb-2.5 pr-4 font-semibold">When</th><th className="pb-2.5 pr-4 font-semibold">Concept</th>
                  <th className="pb-2.5 pr-4 font-semibold">Question</th><th className="pb-2.5 pr-4 font-semibold">Result</th><th className="pb-2.5 text-right font-semibold">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {a.recent_attempts.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap py-3 pr-4 text-xs text-slate-500">{daysAgo(r.day)}</td>
                    <td className="py-3 pr-4 font-semibold text-slate-800">{r.concept_name}</td>
                    <td className="max-w-[280px] truncate py-3 pr-4 text-slate-500" title={r.question_text}>{r.question_text}</td>
                    <td className="py-3 pr-4">
                      <span className={cx('rounded-full px-2.5 py-0.5 text-[11px] font-bold', r.correct ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>{r.correct ? 'Correct' : 'Missed'}</span>
                    </td>
                    <td className="num py-3 text-right text-xs text-slate-500">{r.time_ms ? fmtSeconds(r.time_ms) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
