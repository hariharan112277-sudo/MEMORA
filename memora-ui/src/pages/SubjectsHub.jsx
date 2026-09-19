import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Library, Plus } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { useAsync } from '../hooks/useAsync';
import { asList, pct } from '../utils/memory';
import { CATEGORIES, SUBJECT_THEMES, categoryMeta, themeOf } from '../utils/theme';
import { Button, EmptyState, ErrorState, Field, GlassCard, HealthBadge, Modal, PageHeader, ProgressBar, Spinner, cx } from '../components/ui';

function CreateSubjectModal({ open, onClose, onCreated }) {
  const { learner, toast } = useApp();
  const [form, setForm] = useState({ name: '', category: 'Computer Science', description: '', color: 'indigo' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const pickCategory = (c) => setForm((f) => ({ ...f, category: c.id, color: c.color }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast('Give the subject a name.', 'error');
    setBusy(true);
    try {
      const created = await api.createSubject(learner.id, { ...form, name: form.name.trim() });
      toast(`Created subject “${form.name.trim()}”.`);
      setForm({ name: '', category: 'Computer Science', description: '', color: 'indigo' });
      onCreated(created);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open} onClose={onClose} title="Create subject" description="Group related topics under one subject, such as a course or a language."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="dark" onClick={submit} loading={busy}>Create subject</Button></>}
    >
      <form onSubmit={submit} className="space-y-5">
        <Field label="Subject name" htmlFor="subj-name">
          <input id="subj-name" className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Operating Systems" autoFocus />
        </Field>
        <Field label="Category">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CATEGORIES.map((c) => (
              <button
                type="button" key={c.id} onClick={() => pickCategory(c)} aria-pressed={form.category === c.id}
                className={cx('flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors', form.category === c.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}
              >
                <c.icon className="h-4 w-4 shrink-0" aria-hidden /> {c.id}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Description" htmlFor="subj-desc" hint="Optional. Shown on the subject card.">
          <textarea id="subj-desc" rows={3} className="input resize-none" value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <Field label="Accent color">
          <div className="flex flex-wrap gap-2.5">
            {Object.entries(SUBJECT_THEMES).map(([k, t]) => (
              <button
                type="button" key={k} onClick={() => set('color', k)} aria-label={t.name} aria-pressed={form.color === k}
                className={cx('h-8 w-8 rounded-full ring-offset-2 transition', form.color === k ? 'ring-2 ring-slate-900' : 'ring-0 hover:scale-105')}
                style={{ background: t.hex }}
              />
            ))}
          </div>
        </Field>
      </form>
    </Modal>
  );
}

export default function SubjectsHub() {
  const { learner, version, refresh } = useApp();
  const lid = learner?.id;
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('All');

  const { data, loading, error, reload } = useAsync(async () => (lid ? asList(await api.getSubjects(lid), 'subjects') : []), [lid, version]);

  if (!learner || (loading && !data)) return <Spinner label="Loading subjects" />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const subjects = data || [];
  const cats = ['All', ...new Set(subjects.map((s) => s.category || 'Other'))];
  const shown = subjects.filter((s) => filter === 'All' || (s.category || 'Other') === filter);

  return (
    <>
      <PageHeader
        title="Subjects" subtitle="Your course catalog. Open a subject to see its syllabus and memory health."
        actions={<Button variant="dark" onClick={() => setOpen(true)}><Plus className="h-4 w-4" aria-hidden /> Create Subject</Button>}
      />

      {subjects.length === 0 ? (
        <EmptyState icon={Library} title="No subjects yet" body="Create your first subject, then add topics and questions to start tracking retention." action={<Button variant="dark" onClick={() => setOpen(true)}>Create subject</Button>} />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Filter by category">
            {cats.map((c) => (
              <button
                key={c} role="tab" aria-selected={filter === c} onClick={() => setFilter(c)}
                className={cx('rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors', filter === c ? 'border-obsidian bg-obsidian text-white' : 'border-slate-200 bg-white/80 text-slate-600 hover:border-slate-300')}
              >{c}</button>
            ))}
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((s) => {
              const meta = categoryMeta(s.category);
              const theme = themeOf(s.color);
              return (
                <Link key={s.id} to={`/subjects/${s.id}`} className="glass-card group flex flex-col p-5 transition-shadow hover:shadow-lift">
                  <div className="flex items-start justify-between gap-3">
                    <span className={cx('grid h-11 w-11 place-items-center rounded-2xl ring-1', theme.soft)}><meta.icon className="h-5 w-5" aria-hidden /></span>
                    {s.topic_count > 0 && <HealthBadge retention={s.avg_retention} health={s.health} />}
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{s.name}</h3>
                  <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">{s.description || `${s.category || 'General'} subject`}</p>
                  <div className="mt-5">
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="font-semibold text-slate-600">Average retention</span>
                      <span className="num font-bold text-obsidian">{s.topic_count ? pct(s.avg_retention) : 'No topics yet'}</span>
                    </div>
                    <ProgressBar value={s.avg_retention} label={`${s.name} retention`} />
                  </div>
                  <div className="num mt-4 flex gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
                    <span><b className="text-slate-800">{s.topic_count ?? 0}</b> topics</span>
                    <span><b className="text-slate-800">{s.question_count ?? 0}</b> questions</span>
                    <span><b className={s.due_count ? 'text-rose-600' : 'text-slate-800'}>{s.due_count ?? 0}</b> due</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <CreateSubjectModal
        open={open} onClose={() => setOpen(false)}
        onCreated={(created) => { setOpen(false); refresh(); if (created?.id) navigate(`/subjects/${created.id}`); }}
      />
    </>
  );
}
