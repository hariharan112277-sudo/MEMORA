import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ListChecks, Play, Plus } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { useAsync } from '../hooks/useAsync';
import { fmtDays, normalizeConcepts, pct } from '../utils/memory';
import { categoryMeta, themeOf } from '../utils/theme';
import { BackLink, Button, EmptyState, ErrorState, Field, GlassCard, HealthBadge, KpiCard, Modal, PageHeader, ProgressBar, Spinner, cx } from '../components/ui';

const LEVELS = ['easy', 'medium', 'hard'];

function AddTopicModal({ open, onClose, subjectId, modules, onCreated }) {
  const { toast } = useApp();
  const blank = { name: '', module: '', description: '', difficulty: 'medium' };
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.name.trim()) return toast('Give the topic a name.', 'error');
    setBusy(true);
    try {
      await api.createTopic(subjectId, { ...form, name: form.name.trim(), module: form.module.trim() || 'Core' });
      toast(`Added topic “${form.name.trim()}”. Add questions to start reviewing it.`);
      setForm(blank);
      onCreated();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open} onClose={onClose} title="Add topic" description="Topics are the concepts Memora tracks. Each has its own memory strength."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="dark" onClick={submit} loading={busy}>Add topic</Button></>}
    >
      <form onSubmit={submit} className="space-y-5">
        <Field label="Topic name" htmlFor="topic-name"><input id="topic-name" className="input" autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Deadlock Detection" /></Field>
        <Field label="Module" htmlFor="topic-module" hint="Groups topics in the syllabus. Leave blank for “Core”.">
          <input id="topic-module" className="input" list="module-options" value={form.module} onChange={(e) => set('module', e.target.value)} placeholder="e.g. Operating Systems" />
          <datalist id="module-options">{modules.map((m) => <option key={m} value={m} />)}</datalist>
        </Field>
        <Field label="Description" htmlFor="topic-desc"><textarea id="topic-desc" rows={2} className="input resize-none" value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <Field label="Difficulty">
          <div className="grid grid-cols-3 gap-2">
            {LEVELS.map((l) => (
              <button type="button" key={l} onClick={() => set('difficulty', l)} aria-pressed={form.difficulty === l} className={cx('rounded-xl border px-3 py-2 text-sm font-semibold capitalize transition-colors', form.difficulty === l ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>{l}</button>
            ))}
          </div>
        </Field>
      </form>
    </Modal>
  );
}

export default function SubjectDetail() {
  const { subjectId } = useParams();
  const { version, refresh } = useApp();
  const [open, setOpen] = useState(false);

  const { data, loading, error, reload } = useAsync(() => api.getSubjectDetail(subjectId), [subjectId, version]);

  const subject = data?.subject ?? data;
  const topics = useMemo(() => normalizeConcepts(data?.topics ?? data?.subject?.topics ?? []), [data]);
  const groups = useMemo(() => {
    const map = new Map();
    topics.forEach((t) => { const k = t.module || 'Core'; map.set(k, [...(map.get(k) || []), t]); });
    return [...map.entries()];
  }, [topics]);

  if (loading && !data) return <Spinner label="Loading syllabus" />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const meta = categoryMeta(subject.category);
  const theme = themeOf(subject.color);
  const avg = topics.length ? topics.reduce((a, t) => a + t.retention, 0) / topics.length : 0;
  const totalQs = topics.reduce((a, t) => a + (t.question_count || 0), 0);

  return (
    <>
      <PageHeader
        back={<BackLink to="/subjects">All subjects</BackLink>}
        title={subject.name}
        subtitle={subject.description || `${subject.category || 'General'} subject`}
        actions={<Button variant="dark" onClick={() => setOpen(true)}><Plus className="h-4 w-4" aria-hidden /> Add Topic</Button>}
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <GlassCard className="flex items-center gap-4 p-5">
          <span className={cx('grid h-12 w-12 place-items-center rounded-2xl ring-1', theme.soft)}><meta.icon className="h-6 w-6" aria-hidden /></span>
          <div><p className="text-xs font-semibold text-slate-500">Category</p><p className="font-bold text-obsidian">{subject.category || 'Other'}</p></div>
        </GlassCard>
        <KpiCard label="Average retention" value={topics.length ? pct(avg) : '0%'} />
        <KpiCard label="Topics" value={topics.length} hint={`${topics.filter((t) => t.retention < 0.8).length} due for review`} />
        <KpiCard label="Questions" value={totalQs} />
      </div>

      {topics.length === 0 ? (
        <EmptyState icon={ListChecks} title="This syllabus is empty" body="Add your first topic, then write questions for it in the Question Studio." action={<Button variant="dark" onClick={() => setOpen(true)}>Add topic</Button>} />
      ) : (
        <div className="space-y-8">
          {groups.map(([module, items]) => (
            <section key={module} aria-label={module}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-obsidian">
                <span className={cx('h-2.5 w-2.5 rounded-full', theme.solid)} aria-hidden /> {module}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{items.length}</span>
              </h2>
              <ul className="relative ml-1.5 space-y-3 border-l-2 border-slate-200 pl-5">
                {items.map((t) => (
                  <li key={t.id} className="relative">
                    <span className="absolute -left-[27px] top-6 h-3 w-3 rounded-full border-2 border-white bg-slate-300" aria-hidden />
                    <GlassCard className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="text-base font-bold">{t.name}</h3>
                          <HealthBadge retention={t.retention} health={t.health} />
                        </div>
                        {t.description && <p className="mt-1 line-clamp-1 text-sm text-slate-500">{t.description}</p>}
                        <div className="mt-3 flex items-center gap-3">
                          <ProgressBar value={t.retention} className="max-w-[240px]" label={`${t.name} retention`} />
                          <span className="num text-xs font-bold text-obsidian">{pct(t.retention)}</span>
                        </div>
                      </div>
                      <dl className="num grid grid-cols-3 gap-5 text-center sm:gap-6">
                        <div><dt className="text-[11px] font-semibold text-slate-500">Strength (S)</dt><dd className="mt-0.5 text-sm font-extrabold text-obsidian">{fmtDays(t.strength)}</dd></div>
                        <div><dt className="text-[11px] font-semibold text-slate-500">Questions</dt><dd className="mt-0.5 text-sm font-extrabold text-obsidian">{t.question_count}</dd></div>
                        <div><dt className="text-[11px] font-semibold text-slate-500">Reviews</dt><dd className="mt-0.5 text-sm font-extrabold text-obsidian">{t.reviews}</dd></div>
                      </dl>
                      <div className="flex gap-2">
                        <Button to={`/subjects/${subject.id}/topics/${t.id}/questions`} size="sm" variant="ghost"><ListChecks className="h-3.5 w-3.5" aria-hidden /> Questions</Button>
                        {t.question_count > 0
                          ? <Button to={`/quiz/${t.id}`} size="sm" variant="dark"><Play className="h-3.5 w-3.5" aria-hidden /> Review</Button>
                          : <Button size="sm" variant="dark" disabled title="Add questions first"><Play className="h-3.5 w-3.5" aria-hidden /> Review</Button>}
                      </div>
                    </GlassCard>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <AddTopicModal open={open} onClose={() => setOpen(false)} subjectId={subjectId} modules={groups.map(([m]) => m)} onCreated={() => { setOpen(false); refresh(); }} />
    </>
  );
}
