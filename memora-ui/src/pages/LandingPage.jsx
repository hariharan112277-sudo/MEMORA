import { Link } from 'react-router-dom';
import { BarChart3, BellRing, BrainCircuit, CalendarClock, HeartPulse, Layers, ListChecks } from 'lucide-react';
import Logo from '../components/Logo';
import { Button, HealthBadge } from '../components/ui';
import { baselineRetention, rfRetention } from '../utils/memory';

/* Build SVG paths for the hero curve from the same formulas the app uses. */
function curvePath(fn, w, h, pad = 12) {
  const pts = Array.from({ length: 61 }, (_, i) => {
    const t = (i / 60) * 30;
    return [pad + (i / 60) * (w - pad * 2), pad + (1 - fn(t)) * (h - pad * 2)];
  });
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
}

function HeroPreview() {
  const W = 560;
  const H = 210;
  const rf = curvePath((t) => rfRetention(7, t, 0.8, 2), W, H);
  const base = curvePath((t) => baselineRetention(7, t), W, H);
  const yAt = (r) => 12 + (1 - r) * (H - 24);

  return (
    <div className="relative mx-auto mt-16 max-w-5xl">
      <div className="glass-card overflow-hidden rounded-3xl shadow-lift">
        <div className="flex items-center gap-2 border-b border-slate-200/80 bg-white/70 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500">memora.app/dashboard</span>
        </div>
        <div className="grid gap-4 p-5 sm:p-7 lg:grid-cols-3">
          <div className="grid grid-cols-3 gap-3 lg:col-span-3">
            {[['Average retention', '78%'], ['Due today', '5'], ['Study streak', '12 days']].map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-slate-200 bg-white p-4 text-left">
                <p className="text-[11px] font-semibold text-slate-500">{k}</p>
                <p className="num mt-1.5 text-xl font-extrabold text-obsidian sm:text-2xl">{v}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-left lg:col-span-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-obsidian">Cardiac Cycle: projected retention</p>
              <span className="hidden items-center gap-3 text-[11px] font-medium text-slate-500 sm:flex">
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-indigo-600" />Random Forest</span>
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded border-t-2 border-dashed border-slate-400" />Ebbinghaus</span>
              </span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="Retention decays over 30 days; a review resets the curve">
              <defs>
                <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#6366f1" stopOpacity="0.25" /><stop offset="1" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[1, 0.8, 0.5, 0].map((r) => (
                <line key={r} x1="12" x2={W - 12} y1={yAt(r)} y2={yAt(r)} stroke={r === 0.8 ? '#a7f3d0' : r === 0.5 ? '#fecdd3' : '#e2e8f0'} strokeDasharray="4 5" />
              ))}
              <path d={`${rf} L ${W - 12} ${H - 12} L 12 ${H - 12} Z`} fill="url(#heroFill)" />
              <path d={base} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 5" />
              <path d={rf} pathLength="1" strokeDasharray="1" fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" className="animate-draw" />
            </svg>
          </div>

          <div className="flex flex-col gap-2.5 text-left">
            {[['Nephron Physiology', 0.74], ['Big-O Notation', 0.91], ['Negligence Elements', 0.31]].map(([n, r]) => (
              <div key={n} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-obsidian">{n}</p>
                  <p className="num text-xs text-slate-500">{Math.round(r * 100)}% retained</p>
                </div>
                <HealthBadge retention={r} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: BrainCircuit, title: 'Forgetting-curve prediction', body: 'A Random Forest model estimates how fast each concept fades, based on your recall accuracy and how difficult the topic is.' },
  { icon: CalendarClock, title: 'A daily queue that adapts', body: 'Every day you get the concepts closest to slipping away, ordered by urgency, with the time each review should take.' },
  { icon: HeartPulse, title: 'Memory health at a glance', body: 'Each topic is tagged stable, weak or critical from its predicted retention, so you know where to spend your effort.' },
  { icon: ListChecks, title: 'Question Studio', body: 'Write multiple-choice questions with explanations and difficulty, or paste in a whole set from JSON or a simple text format.' },
  { icon: Layers, title: 'Subjects and syllabi', body: 'Organize computer science, medicine, law or languages into subjects, modules and topics, each with its own memory strength.' },
  { icon: BarChart3, title: 'Analytics that show progress', body: 'Retention heatmaps, streaks, recall accuracy logs and decay curves compared across every subject you study.' },
];

const STEPS = [
  { title: 'Add what you are learning', body: 'Create a subject, add topics, and write or import the questions that test them.' },
  { title: 'Take a short review', body: 'Answer a handful of questions per topic. Each answer updates that topic’s memory strength.' },
  { title: 'Let Memora schedule the next one', body: 'Reviews are timed for just before you would forget, so every minute of study counts.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex" aria-label="Sections">
          <a href="#features" className="hover:text-obsidian">Features</a>
          <a href="#how" className="hover:text-obsidian">How it works</a>
          <a href="#preview" className="hover:text-obsidian">Preview</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden px-4 py-2 text-sm font-semibold text-slate-700 hover:text-obsidian sm:block">Log in</Link>
          <Button to="/signup" variant="dark">Get started</Button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-10 pt-14 text-center sm:px-8 sm:pt-20" id="preview">
          <p className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-xs font-semibold text-slate-600 backdrop-blur">
            <BellRing className="h-3.5 w-3.5 text-indigo-600" aria-hidden /> Spaced repetition, scheduled by a learned model
          </p>
          <h1 className="mx-auto max-w-4xl text-[2.6rem] font-extrabold leading-[1.02] sm:text-6xl lg:text-[5.25rem]">
            Stop forgetting what you study.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Memora predicts when each concept will fade from your memory and schedules the review that saves it, across every subject you are learning.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button to="/signup" variant="dark" size="lg">Start learning free</Button>
            <Button to="/login?demo=1" variant="ghost" size="lg">Explore the demo</Button>
          </div>
          <HeroPreview />
        </section>

        <section id="features" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-extrabold sm:text-4xl">Everything you need to make learning stick</h2>
            <p className="mt-3 text-slate-600">From the first question you write to the retention curve you watch improve.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article key={title} className="glass-card p-6">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><Icon className="h-5 w-5" aria-hidden /></span>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <div className="glass-card grid gap-10 p-8 sm:p-12 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <h2 className="text-3xl font-extrabold">How a review cycle works</h2>
              <p className="mt-3 text-slate-600">Three steps, repeated daily. Most sessions take less time than a coffee break.</p>
            </div>
            <ol className="space-y-6 lg:col-span-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-obsidian text-sm font-bold text-white">{i + 1}</span>
                  <div>
                    <h3 className="text-base font-bold">{s.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="relative overflow-hidden rounded-[2rem] bg-obsidian px-8 py-14 text-center sm:px-16">
            <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl" aria-hidden />
            <h2 className="relative mx-auto max-w-2xl text-3xl font-extrabold !text-white sm:text-4xl">Build a memory that lasts longer than the exam.</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-slate-300">Create a learner profile in under a minute and get your first review queue right away.</p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/signup" className="btn btn-lg bg-white text-obsidian hover:bg-slate-100">Create your profile</Link>
              <Link to="/login?demo=1" className="btn btn-lg border border-white/25 text-white hover:bg-white/10">Try the demo</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl border-t border-slate-200/80 px-5 py-8 text-sm text-slate-500 sm:px-8">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <Logo />
          <p>Memora 2.0, an AI-powered cognitive memory platform.</p>
        </div>
      </footer>
    </div>
  );
}
