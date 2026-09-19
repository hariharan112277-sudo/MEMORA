import { Play } from 'lucide-react';
import KpiGrid from '../components/KpiGrid';
import ConceptList from '../components/ConceptList';
import WeakConceptsPanel from '../components/WeakConceptsPanel';
import RevisionSchedule from '../components/RevisionSchedule';
import RetentionChart from '../components/RetentionChart';
import { useApp } from '../context/AppContext';
import { statusOf } from '../lib/utils';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { learner, concepts, weak, overdue, openQuiz } = useApp();
  const weakest = [...concepts].sort((a, b) => a.retention - b.retention)[0];
  const urgent = concepts.filter((c) => statusOf(c) !== 'stable').length || weak.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{learner ? `Hi ${learner.name.split(' ')[0]}, here's your memory today` : 'Your memory today'}</h1>
          <p className="muted mt-1">
            {urgent ? `${urgent} concept${urgent > 1 ? 's' : ''} slipping` : 'All concepts are holding steady'}
            {overdue ? `, ${overdue} review${overdue > 1 ? 's' : ''} overdue.` : '.'}
          </p>
        </div>
        {weakest && <button className="btn-primary" onClick={() => openQuiz(weakest)}><Play size={15} aria-hidden /> Revise {weakest.name}</button>}
      </div>

      <KpiGrid />

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="space-y-3 xl:col-span-2" aria-labelledby="tracked">
          <div className="flex items-center justify-between">
            <h2 id="tracked" className="section-title">Tracked concepts</h2>
            <Link to="/concepts" className="text-sm font-semibold text-indigo-300 hover:underline">Manage concepts</Link>
          </div>
          <ConceptList concepts={concepts} />
        </section>
        <div className="space-y-6">
          <WeakConceptsPanel />
          <RevisionSchedule limit={4} />
        </div>
      </div>

      <RetentionChart />
    </div>
  );
}
