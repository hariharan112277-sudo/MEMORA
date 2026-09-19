import { useEffect, useState } from 'react';
import { ExternalLink, Server } from 'lucide-react';
import { api } from '../services/api';
import { STATUS } from '../lib/utils';

const FEATURES = ['Days since last review', 'Previous memory strength', 'Rolling quiz accuracy', 'Concept difficulty', 'Response time'];

export default function About() {
  const [health, setHealth] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.health().then(setHealth).catch((e) => setErr(e.message)); }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">How Memora works</h1>
        <p className="muted mt-2 max-w-prose">Memora estimates how much of each concept you still remember, then schedules the next review just before it slips. Every quiz answer updates the estimate.</p>
      </div>

      <section className="glass p-5">
        <h2 className="section-title">The forgetting curve</h2>
        <p className="mt-3 rounded-xl bg-white/[0.05] p-4 text-center font-mono text-lg text-indigo-200">R(t) = 2<sup>−t / S</sup></p>
        <p className="muted mt-3"><b className="text-white">t</b> is days since your last review and <b className="text-white">S</b> is memory strength in days. A correct answer raises S, a wrong one lowers it. A Random Forest model then adjusts the curve using five signals:</p>
        <ul className="mt-3 flex flex-wrap gap-2">{FEATURES.map((f) => <li key={f} className="chip bg-violet-500/10 text-violet-300 ring-violet-500/30">{f}</li>)}</ul>
      </section>

      <section className="glass p-5">
        <h2 className="section-title">Concept health</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {[['stable', '80% or higher'], ['weak', '50% to 79%'], ['critical', 'Below 50%']].map(([k, r]) => (
            <li key={k} className="rounded-xl bg-white/[0.05] p-4" style={{ borderTop: `2px solid ${STATUS[k].color}` }}>
              <p className={`font-bold ${STATUS[k].text}`}>{STATUS[k].label}</p><p className="muted">{r} retained</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass p-5">
        <h2 className="section-title flex items-center gap-2"><Server size={16} aria-hidden /> Backend connection</h2>
        <p className="muted mt-2 break-all">API: {api.baseUrl}</p>
        <p className={`mt-1 text-sm font-semibold ${err ? 'text-rose-300' : health ? 'text-emerald-400' : 'text-slate-400'}`}>
          {err ? err : health ? `Online${health.ml_model_loaded === false ? ' (ML model not loaded, using formula fallback)' : ' · ML model loaded'}` : 'Checking…'}
        </p>
        <a href="https://github.com/hariharan112277-sudo/MEMORA" target="_blank" rel="noreferrer" className="btn-ghost mt-4">View on GitHub <ExternalLink size={14} aria-hidden /></a>
      </section>
    </div>
  );
}
