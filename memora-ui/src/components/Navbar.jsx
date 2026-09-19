import { NavLink } from 'react-router-dom';
import { Activity, CalendarClock, ChevronDown, FastForward, Info, Layers, LayoutDashboard, RotateCcw, StepForward } from 'lucide-react';
import { useApp } from '../context/AppContext';

const links = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/concepts', 'Concepts', Layers],
  ['/schedule', 'Schedule', CalendarClock],
  ['/analytics', 'Analytics', Activity],
  ['/about', 'About', Info],
];

export default function Navbar() {
  const { learners, learnerId, selectLearner, day, advanceDay, resetDemo, busy } = useApp();

  const reset = () => {
    if (window.confirm('Reset all demo data back to day 0? This cannot be undone.')) resetDemo();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-ink-900/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2.5" aria-label="MEMORA home">
          <span className="grid h-9 w-9 place-items-center rounded-xl shadow-glow" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <svg viewBox="0 0 32 32" className="h-5 w-5"><path d="M7 22V10l9 8 9-8v12" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className="text-lg font-extrabold tracking-tight text-white" style={{ textShadow: '0 0 18px rgba(129,140,248,.7)' }}>Memora</span>
        </NavLink>

        <nav aria-label="Main" className="order-last -mx-1 flex w-full gap-1 overflow-x-auto md:order-none md:mx-0 md:w-auto">
          {links.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => `flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition ${isActive ? 'bg-indigo-500/15 text-indigo-200' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <Icon size={15} aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Learner</span>
            <select value={learnerId} onChange={(e) => selectLearner(e.target.value)} disabled={!learners.length}
              className="input appearance-none py-1.5 pr-8 font-semibold">
              {!learners.length && <option value="">No learners</option>}
              {learners.map((l) => <option key={l.learner_id} value={l.learner_id}>{l.name}</option>)}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
          </label>
          <span className="chip bg-indigo-500/10 py-1.5 text-indigo-200 ring-indigo-500/30" aria-label={`Simulation day ${day}`}>Day {day}</span>
          <button className="btn-ghost py-1.5" disabled={busy} onClick={() => advanceDay(1)}><StepForward size={15} aria-hidden /> +1 day</button>
          <button className="btn-ghost py-1.5" disabled={busy} onClick={() => advanceDay(7)}><FastForward size={15} aria-hidden /> +7 days</button>
          <button className="btn-danger py-1.5" disabled={busy} onClick={reset}><RotateCcw size={15} aria-hidden /> Reset</button>
        </div>
      </div>
    </header>
  );
}
