import { useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, FileUp, ListChecks, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { useAsync } from '../hooks/useAsync';
import { asList, normalizeConcepts, normalizeQuestion } from '../utils/memory';
import { BackLink, Button, EmptyState, ErrorState, Field, GlassCard, Modal, PageHeader, Spinner, cx } from '../components/ui';

const LEVELS = ['easy', 'medium', 'hard'];
const LETTERS = ['A', 'B', 'C', 'D'];
const LEVEL_STYLE = { easy: 'bg-emerald-50 text-emerald-700', medium: 'bg-amber-50 text-amber-700', hard: 'bg-rose-50 text-rose-700' };
const blankForm = () => ({ id: null, text: '', options: ['', '', '', ''], correct: 0, explanation: '', difficulty: 'medium' });

/* ---------------- bulk import parsing ---------------- */

function resolveCorrect(raw, options) {
  const s = String(raw ?? '').trim();
  if (/^[A-Da-d]$/.test(s)) return s.toUpperCase().charCodeAt(0) - 65;
  if (/^[1-4]$/.test(s)) return Number(s) - 1; // 1-based when given as "correct" / "answer"
  return options.findIndex((o) => o.trim().toLowerCase() === s.toLowerCase());
}

function toItem(o, label) {
  const text = String(o.text ?? o.question ?? o.prompt ?? '').trim();
  const options = (o.options ?? o.choices ?? []).map((x) => String(x).trim());
  if (!text) return { error: `${label}: missing question text` };
  if (options.length !== 4 || options.some((x) => !x)) return { error: `${label}: needs exactly 4 non-empty options` };
  const idx = o.correct_index ?? o.correctIndex; // 0-based
  const correct = typeof idx === 'number' ? (idx >= 0 && idx <= 3 ? idx : -1) : resolveCorrect(o.correct ?? o.answer, options);
  if (correct < 0) return { error: `${label}: could not tell which option is correct` };
  const difficulty = LEVELS.includes(String(o.difficulty || '').toLowerCase()) ? String(o.difficulty).toLowerCase() : 'medium';
  return { item: { text, options, correct_index: correct, explanation: String(o.explanation ?? '').trim(), difficulty } };
}

export function parseBulk(input) {
  const t = input.trim();
  const items = [];
  const errors = [];
  if (!t) return { items, errors };

  if (t.startsWith('[') || t.startsWith('{')) {
    try {
      const parsed = JSON.parse(t);
      const arr = Array.isArray(parsed) ? parsed : asList(parsed, 'questions');
      if (!arr.length) errors.push('No questions found in the JSON.');
      arr.forEach((o, i) => { const r = toItem(o || {}, `Item ${i + 1}`); r.item ? items.push(r.item) : errors.push(r.error); });
    } catch (e) {
      errors.push(`Invalid JSON: ${e.message}`);
    }
    return { items, errors };
  }

  // Line format: Question | A | B | C | D | correct (A-D) | explanation | difficulty
  t.split(/\r?\n/).forEach((line, i) => {
    const l = line.trim();
    if (!l || l.startsWith('#')) return;
    const p = l.split('|').map((x) => x.trim());
    if (p.length < 6) return errors.push(`Line ${i + 1}: expected at least 6 fields separated by "|"`);
    const r = toItem({ text: p[0], options: p.slice(1, 5), correct: p[5], explanation: p[6], difficulty: p[7] }, `Line ${i + 1}`);
    r.item ? items.push(r.item) : errors.push(r.error);
  });
  return { items, errors };
}

const EXAMPLE = `[
  {
    "question": "What does DNS stand for?",
    "options": ["Domain Name System", "Data Network Service", "Digital Name Server", "Dynamic Node Set"],
    "correct": "A",
    "explanation": "DNS translates domain names into IP addresses.",
    "difficulty": "easy"
  }
]

// ...or one question per line:
// Question | A | B | C | D | correct (A-D) | explanation | difficulty`;

function BulkImportModal({ open, onClose, topicId, onDone }) {
  const { toast } = useApp();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const parsed = useMemo(() => parseBulk(text), [text]);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (f) setText(await f.text());
    e.target.value = '';
  };

  const run = async () => {
    setBusy(true);
    let ok = 0;
    try {
      for (const item of parsed.items) {
        await api.createQuestion(topicId, { ...item, question: item.text }); // `question` alias for backends that expect it
        ok += 1;
      }
      toast(`Imported ${ok} question${ok === 1 ? '' : 's'}.`);
      setText('');
      onDone();
    } catch (err) {
      toast(`Imported ${ok} before an error: ${err.message}`, 'error');
      if (ok) onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open} onClose={onClose} wide title="Bulk import questions"
      description="Paste JSON or pipe-separated lines. Each question needs four options and a correct answer."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="dark" onClick={run} loading={busy} disabled={!parsed.items.length}>Import {parsed.items.length || ''} question{parsed.items.length === 1 ? '' : 's'}</Button>
      </>}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept=".json,.txt,.csv,.psv,text/plain,application/json" className="hidden" onChange={onFile} />
        <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()}><FileUp className="h-3.5 w-3.5" aria-hidden /> Choose file</Button>
        <Button size="sm" variant="ghost" onClick={() => setText(EXAMPLE.split('\n\n//')[0])}>Insert example</Button>
      </div>
      <textarea
        aria-label="Questions to import" rows={11} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false}
        className="input thin-scroll resize-y font-mono text-xs leading-relaxed" placeholder={EXAMPLE}
      />
      <div className="mt-3 space-y-1.5 text-xs" aria-live="polite">
        {text.trim() && <p className="font-semibold text-slate-700">{parsed.items.length} valid, {parsed.errors.length} with problems</p>}
        {parsed.errors.slice(0, 6).map((er) => <p key={er} className="text-rose-600">{er}</p>)}
        {parsed.errors.length > 6 && <p className="text-rose-600">and {parsed.errors.length - 6} more</p>}
      </div>
    </Modal>
  );
}

/* ---------------- page ---------------- */

export default function QuestionStudio() {
  const { subjectId, topicId } = useParams();
  const { toast, version, refresh } = useApp();
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('all');

  const detail = useAsync(() => api.getSubjectDetail(subjectId), [subjectId, version]);
  const qs = useAsync(async () => asList(await api.getQuestions(topicId), 'questions').map(normalizeQuestion), [topicId, version]);

  const topic = useMemo(() => normalizeConcepts(detail.data?.topics ?? []).find((t) => String(t.id) === String(topicId)), [detail.data, topicId]);
  const subject = detail.data?.subject ?? detail.data;

  const questions = qs.data || [];
  const shown = useMemo(
    () => questions.filter((q) => (level === 'all' || q.difficulty === level) && (!query || q.text.toLowerCase().includes(query.toLowerCase()))),
    [questions, level, query]
  );

  if ((qs.loading && !qs.data) || (detail.loading && !detail.data)) return <Spinner label="Opening Question Studio" />;
  if (qs.error && !qs.data) return <ErrorState error={qs.error} onRetry={qs.reload} />;

  const setOpt = (i, v) => setForm((f) => ({ ...f, options: f.options.map((o, idx) => (idx === i ? v : o)) }));
  const edit = (q) => setForm({ id: q.id, text: q.text, options: [...q.options, '', '', '', ''].slice(0, 4), correct: q.correct_index ?? 0, explanation: q.explanation || '', difficulty: q.difficulty || 'medium' });

  const save = async (e) => {
    e.preventDefault();
    if (!form.text.trim()) return toast('Write the question first.', 'error');
    if (form.options.some((o) => !o.trim())) return toast('Fill in all four options.', 'error');
    const payload = {
      text: form.text.trim(), question: form.text.trim(), options: form.options.map((o) => o.trim()),
      correct_index: form.correct, explanation: form.explanation.trim(), difficulty: form.difficulty,
    };
    setSaving(true);
    try {
      if (form.id) await api.updateQuestion(form.id, payload);
      else await api.createQuestion(topicId, payload);
      toast(form.id ? 'Question updated.' : 'Question added.');
      setForm(blankForm());
      qs.reload();
      refresh();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (q) => {
    if (!window.confirm('Delete this question? This cannot be undone.')) return;
    try {
      await api.deleteQuestion(q.id);
      toast('Question deleted.');
      if (form.id === q.id) setForm(blankForm());
      qs.reload();
      refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <PageHeader
        back={<BackLink to={`/subjects/${subjectId}`}>{subject?.name || 'Subject'}</BackLink>}
        title={topic?.name ? `Questions: ${topic.name}` : 'Question Studio'}
        subtitle="Write, edit and import the multiple-choice questions used in this topic’s reviews."
        actions={<Button variant="ghost" onClick={() => setBulkOpen(true)}><Upload className="h-4 w-4" aria-hidden /> Bulk import</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3" aria-label="Question bank">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input aria-label="Search questions" className="input !pl-10" placeholder={`Search ${questions.length} question${questions.length === 1 ? '' : 's'}`} value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <select aria-label="Filter by difficulty" className="input sm:!w-40" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="all">All difficulties</option>
              {LEVELS.map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
            </select>
          </div>

          {questions.length === 0 ? (
            <EmptyState icon={ListChecks} title="No questions yet" body="Use the editor to write your first question, or bulk import a set." action={<Button variant="dark" onClick={() => setBulkOpen(true)}>Bulk import</Button>} />
          ) : shown.length === 0 ? (
            <GlassCard className="p-8 text-center text-sm text-slate-500">No questions match your filters.</GlassCard>
          ) : (
            <ul className="space-y-3">
              {shown.map((q) => (
                <li key={q.id}>
                  <GlassCard className={cx('p-4 sm:p-5', form.id === q.id && '!border-indigo-300 ring-2 ring-indigo-100')}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-bold leading-snug text-obsidian">{q.text}</p>
                      <span className={cx('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize', LEVEL_STYLE[q.difficulty] || LEVEL_STYLE.medium)}>{q.difficulty}</span>
                    </div>
                    <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
                      {q.options.map((o, i) => (
                        <li key={i} className={cx('flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-xs', i === q.correct_index ? 'bg-emerald-50 font-semibold text-emerald-800' : 'text-slate-600')}>
                          <span className="num font-bold">{LETTERS[i]}</span><span className="flex-1">{o}</span>
                          {i === q.correct_index && <Check className="h-3.5 w-3.5 shrink-0" aria-label="Correct answer" />}
                        </li>
                      ))}
                    </ol>
                    {q.explanation && <p className="mt-3 border-l-2 border-indigo-200 pl-3 text-xs leading-relaxed text-slate-500">{q.explanation}</p>}
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => edit(q)}><Pencil className="h-3.5 w-3.5" aria-hidden /> Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => remove(q)}><Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete</Button>
                    </div>
                  </GlassCard>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="lg:col-span-2" aria-label="Question editor">
          <GlassCard className="p-5 sm:p-6 lg:sticky lg:top-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold">{form.id ? 'Edit question' : 'New question'}</h2>
              {form.id && <button type="button" onClick={() => setForm(blankForm())} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">Cancel edit</button>}
            </div>
            <form onSubmit={save} className="space-y-4">
              <Field label="Question" htmlFor="q-text"><textarea id="q-text" rows={3} className="input resize-none" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="What is…?" /></Field>
              <fieldset>
                <legend className="label">Options <span className="font-normal text-slate-500">(select the correct one)</span></legend>
                <div className="space-y-2">
                  {form.options.map((o, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <button
                        type="button" role="radio" aria-checked={form.correct === i} aria-label={`Mark option ${LETTERS[i]} as correct`} onClick={() => setForm({ ...form, correct: i })}
                        className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-full border text-xs font-bold transition-colors', form.correct === i ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300')}
                      >{form.correct === i ? <Check className="h-4 w-4" aria-hidden /> : LETTERS[i]}</button>
                      <input aria-label={`Option ${LETTERS[i]}`} className="input" value={o} onChange={(e) => setOpt(i, e.target.value)} placeholder={`Option ${LETTERS[i]}`} />
                    </div>
                  ))}
                </div>
              </fieldset>
              <Field label="Explanation" htmlFor="q-exp" hint="Shown after the learner answers."><textarea id="q-exp" rows={2} className="input resize-none" value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} /></Field>
              <Field label="Difficulty">
                <div className="grid grid-cols-3 gap-2">
                  {LEVELS.map((l) => (
                    <button type="button" key={l} aria-pressed={form.difficulty === l} onClick={() => setForm({ ...form, difficulty: l })} className={cx('rounded-xl border px-3 py-2 text-xs font-semibold capitalize transition-colors', form.difficulty === l ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>{l}</button>
                  ))}
                </div>
              </Field>
              <Button type="submit" variant="dark" className="w-full" loading={saving}>
                {form.id ? 'Save changes' : <><Plus className="h-4 w-4" aria-hidden /> Add question</>}
              </Button>
            </form>
          </GlassCard>
        </aside>
      </div>

      <BulkImportModal open={bulkOpen} onClose={() => setBulkOpen(false)} topicId={topicId} onDone={() => { setBulkOpen(false); qs.reload(); refresh(); }} />
    </>
  );
}
