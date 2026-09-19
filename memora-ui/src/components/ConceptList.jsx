import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import ConceptCard from './ConceptCard';
import { useApp } from '../context/AppContext';

export default function ConceptList({ concepts, allowDelete = false }) {
  const { chartConceptId, setChartConceptId, openQuiz, removeConcept } = useApp();

  const showChart = (c) => {
    setChartConceptId(c.concept_id);
    document.getElementById('retention-chart')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const del = (c) => { if (window.confirm(`Delete "${c.name}" and its history?`)) removeConcept(c); };

  if (!concepts.length) {
    return (
      <div className="glass grid place-items-center gap-2 p-10 text-center">
        <Layers className="text-slate-500" aria-hidden />
        <p className="font-semibold text-white">No concepts to show</p>
        <p className="muted">Add a concept from the <Link to="/concepts" className="text-indigo-300 underline">Concepts page</Link> to start tracking it.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {concepts.map((c) => (
        <ConceptCard key={c.concept_id} concept={c} selected={c.concept_id === chartConceptId}
          onChart={showChart} onRevise={openQuiz} onDelete={allowDelete ? del : undefined} />
      ))}
    </div>
  );
}
