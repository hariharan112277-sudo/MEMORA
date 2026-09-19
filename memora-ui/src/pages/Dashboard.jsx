import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Brain, Flame, Gauge, Library, ListTodo, Play, Timer } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { useAsync } from '../hooks/useAsync';
import { asList, buildCurve, DIFFICULTY_SCORE, dueLabel, fmtDays, greeting, normalizeConcepts, pct } from '../utils/memory';
import { DecayChart } from '../components/charts';
import { Button, EmptyState, ErrorState, GlassCard, HealthBadge, KpiCard, ProgressBar, SectionTitle, Spinner } from '../components/ui';

function ConceptCard({ c }) {
  return (
    <GlassCard className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-obsidian" title={c.name}>{c.name}</p>
          <p className="truncate text-xs text-slate-500">{c.subject_name}{c.module ? `, ${c.module}` : ''}</p>
        </div>
        <HealthBadge retention={c.retention} health={c.health} />
      </div>
      <div className="mt-4 flex items-end justify-between">
        <p className="num text-2xl font-extrabold text-obsidian">{pct(c.retention)}</p>
        <p className="num text-xs text-slate-500">S = {fmtDays(c.strength)}</p>
      </div>
      <ProgressBar value={c.retention} className="mt-2" label={`${c.name} retention`} />
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{dueLabel(c.days_until_review)}</span>
        <Button to={`/quiz/${c.id}`} size="sm" variant="ghost">Review</Button>
      </div>
    </GlassCard>
  );
}

export default function Dashboard() {
  const { learner, profile, version } = useApp();
  const lid = learner.id;
  const [selectedId, setSelectedId] = useState(null);

  const { data, loading, error, reload } = useAsync(async () => {
    const [concepts, weak, schedule, analytics] = await Promise.all([
      api.getConcepts(lid), api.getWeakConcepts(lid), api.getSchedule(lid), api.getAnalytics(lid),
    ]);
    return {
      concepts: normalizeConcepts(concepts),
      weak: normalizeConcepts(weak),
      queue: normalizeConcepts(asList(schedule, 'queue', 'schedule')),
      analytics: analytics || {},
    };
  }, [lid, version]);

  const concepts = data?.concepts || [];
  const byRisk = useMemo(() => [...concepts].sort((a, b) => a.retention - b.retention), [concepts]);
  const activeId = selectedId && concepts.some((c) => c.id === selectedId) ? selectedId : byRisk[0]?.id;
  const active = concepts.find((c) => c.id === activeId);

  const prediction = useAsync(async () => (activeId ? api.predictRetention(lid, activeId) : null), [lid, activeId, version]);
  const curve = useMemo(() => {
    const fromApi = prediction.data?.curve || prediction.data?.predicted_curve;
    if (Array.isArray(fromApi) && fromApi.length) return fromApi.map((p, i) => ({ day: p.day ?? i, rf: p.rf ?? p.predicted ?? p.retention, baseline: p.baseline ?? p.ebbinghaus ?? p.retention }));
    return active ? buildCurve(active.strength, active.elapsed_days, { accuracy: active.accuracy, difficulty: DIFFICULTY_SCORE[active.difficulty] || 2 }) : [];
  }, [prediction.data, active]);

  if (loading && !data) return <Spinner label="Building your command center" />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const { weak, queue, analytics } = data;
  const critical = weak.filter((c) => c.health === 'CRITICAL');
  const avgRetention = concepts.length ? concepts.reduce((a, c) => a + c.retention, 0) / concepts.length : 0;
  const target = profile?.daily_target || 10;
  const doneToday = analytics.reviews_today || 0;
  const first = (profile?.name || learner.name || '').split(' ')[0];

  if (!concepts.length) {
    return (
      <>
        <h1 className="mb-7 text-3xl font-extrabold">{greeting()}, {first}</h1>
        <EmptyState
          icon={Library} title="Add your first subject"
          body="Create a subject, add topics and write a few questions. Memora starts tracking memory strength as soon as you review."
          action={<Button to="/subjects" variant="dark">Go to subjects</Button>}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-[2rem]">{greeting()}, {first}</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {queue.length ? `${queue.length} concept${queue.length > 1 ? 's are' : ' is'} ready for review today.` : 'Nothing is due right now. Your memories are holding up.'}
          </p>
        </div>
        {queue.length > 0 && (
          <Button to={`/quiz/${queue[0].id}`} variant="indigo" size="lg"><Play className="h-4 w-4" aria-hidden /> Start today’s review</Button>
        )}
      </div>

      <section aria-label="Key metrics" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Average retention" value={pct(avgRetention)} hint={`${analytics.stable_count ?? concepts.filter((c) => c.health === 'STABLE').length} stable topics`} icon={Gauge} tone="indigo" />
        <KpiCard label="Concepts tracked" value={concepts.length} hint={`${new Set(concepts.map((c) => c.subject_id)).size} subjects`} icon={Brain} tone="sky" />
        <KpiCard label="Due for review" value={queue.length} hint={critical.length ? `${critical.length} critical` : 'None critical'} icon={ListTodo} tone={critical.length ? 'rose' : 'emerald'} />
        <KpiCard label="Study streak" value={`${analytics.streak ?? 0} day${analytics.streak === 1 ? '' : 's'}`} hint={`${doneToday}/${target} reviews today`} icon={Flame} tone="amber" />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="p-5 sm:p-6">
          <SectionTitle title="Daily review queue" hint="Most urgent first" />
          {queue.length === 0 ? (
            <p className="rounded-xl bg-emerald-50 px-4 py-6 text-center text-sm font-medium text-emerald-700">You’re all caught up.</p>
          ) : (
            <ol className="space-y-2.5">
              {queue.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link to={`/quiz/${c.id}`} className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition-colors hover:border-indigo-300">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-obsidian">{c.name}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500"><Timer className="h-3 w-3" aria-hidden /> about {c.est_minutes ?? 4} min, {pct(c.retention)} retained</p>
                    </div>
                    <HealthBadge retention={c.retention} health={c.health} />
                  </Link>
                </li>
              ))}
            </ol>
          )}
          {queue.length > 6 && <p className="mt-3 text-center text-xs text-slate-500">and {queue.length - 6} more</p>}
          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Today’s reviews</span><span className="num">{doneToday} / {target}</span>
            </div>
            <ProgressBar value={target ? doneToday / target : 0} tone="bg-indigo-500" label="Daily target progress" />
          </div>
        </GlassCard>

        <GlassCard className="p-5 sm:p-6 lg:col-span-2">
          <SectionTitle
            title="Retention decay curve"
            hint="Projected retention over the next 30 days if you do not review"
            action={
              <select aria-label="Choose concept" value={activeId} onChange={(e) => setSelectedId(e.target.value)} className="input !w-auto max-w-[200px] !py-1.5 text-xs font-semibold">
                {byRisk.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            }
          />
          {active && (
            <p className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="num">Now: <b className="text-slate-800">{pct(active.retention)}</b></span>
              <span className="num">Strength: <b className="text-slate-800">{fmtDays(active.strength)}</b></span>
              <span>{dueLabel(active.days_until_review)}</span>
            </p>
          )}
          <DecayChart curve={curve} height={270} />
        </GlassCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="self-start p-5 sm:p-6">
          <SectionTitle title="Weak and critical alerts" hint={weak.length ? `${weak.length} topic${weak.length > 1 ? 's' : ''} below 80%` : undefined} />
          {weak.length === 0 ? (
            <p className="rounded-xl bg-emerald-50 px-4 py-6 text-center text-sm font-medium text-emerald-700">Every topic is stable.</p>
          ) : (
            <ul className="space-y-2.5">
              {weak.slice(0, 6).map((c) => (
                <li key={c.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${c.health === 'CRITICAL' ? 'border-rose-200 bg-rose-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
                  <AlertTriangle className={`h-4 w-4 shrink-0 ${c.health === 'CRITICAL' ? 'text-rose-600' : 'text-amber-600'}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-obsidian">{c.name}</p>
                    <p className="num text-xs text-slate-600">{pct(c.retention)} retained, {c.subject_name}</p>
                  </div>
                  <Link to={`/quiz/${c.id}`} className="flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900">Fix <ArrowRight className="h-3 w-3" aria-hidden /></Link>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <div className="lg:col-span-2">
          <SectionTitle title="Tracked concepts" hint={`${concepts.length} concepts, weakest first`} action={<Button to="/subjects" size="sm" variant="ghost">All subjects</Button>} />
          <div className="grid gap-4 sm:grid-cols-2">
            {byRisk.slice(0, 8).map((c) => <ConceptCard key={c.id} c={c} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
