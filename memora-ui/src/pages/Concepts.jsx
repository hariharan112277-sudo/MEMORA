import { useMemo, useState } from 'react';
import { Plus, Search, UserPlus } from 'lucide-react';
import ConceptList from '../components/ConceptList';
import RetentionChart from '../components/RetentionChart';
import { useApp } from '../context/AppContext';
import { statusOf } from '../lib/utils';

const FILTERS = ['all', 'stable', 'weak', 'critical'];

export default function Concepts() {
  const { concepts, addConcept, createLearner, busy, learner } = useApp();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('retention');
  const [name, setName] = useState('');
  const [diff, setDiff] = useState(0.5);
  const [lname, setLname] = useState('');

  const list = useMemo(() => {
    const out = concepts.filter((c) => (filter === 'all' || statusOf(c) === filter) && c.name.toLowerCase().includes(q.toLowerCase()));
    const by = { retention: (a, b) => a.retention - b.retention, strength: (a, b) => b.strength - a.strength, name: (a, b) => a.name.localeCompare(b.name) };
    return out.sort(by[sort]);
  }, [concepts, q, filter, sort]);

  const submitConcept = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addConcept({ name: name.trim(), difficulty: diff });
    setName('');
  };
  const submitLearner = async (e) => {
    e.preventDefault();
    if (!lname.trim()) return;
    await createLearner(lname.trim());
    setLname('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Concepts</h1>
        <p className="muted mt-1">Everything {learner?.name || 'this learner'} is tracking, worst retention first by default.</p>
      </div>

      <div className="glass flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden />
          <input className="input pl-9" placeholder="Search concepts" aria-label="Search concepts" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-1" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition ${filter === f ? 'bg-indigo-500/20 text-indigo-200' : 'text-slate-400 hover:bg-white/5'}`}>{f}</button>
          ))}
        </div>
        <select className="input w-auto py-1.5" aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="retention">Lowest retention</option>
          <option value="strength">Highest strength</option>
          <option value="name">Name</option>
        </select>
      </div>

      <ConceptList concepts={list} allowDelete />

      <RetentionChart />

      <div className="grid gap-4 md:grid-cols-2">
        <form onSubmit={submitConcept} className="glass space-y-3 p-5">
          <h2 className="section-title">Add a concept</h2>
          <input className="input" placeholder="e.g. Graph Theory" aria-label="Concept name" value={name} onChange={(e) => setName(e.target.value)} required />
          <label className="block text-sm text-slate-300">Difficulty: <b className="text-white">{Math.round(diff * 100)}%</b>
            <input type="range" min="0.1" max="1" step="0.1" value={diff} onChange={(e) => setDiff(Number(e.target.value))} className="mt-2 w-full accent-indigo-500" />
          </label>
          <button className="btn-primary" disabled={busy || !name.trim()}><Plus size={15} aria-hidden /> Add concept</button>
        </form>
        <form onSubmit={submitLearner} className="glass space-y-3 p-5">
          <h2 className="section-title">Add a learner</h2>
          <p className="muted">Each learner gets their own concepts and memory history.</p>
          <input className="input" placeholder="Full name" aria-label="Learner name" value={lname} onChange={(e) => setLname(e.target.value)} required />
          <button className="btn-ghost" disabled={busy || !lname.trim()}><UserPlus size={15} aria-hidden /> Add learner</button>
        </form>
      </div>
    </div>
  );
}
