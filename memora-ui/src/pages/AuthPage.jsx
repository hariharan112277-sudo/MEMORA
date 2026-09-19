import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { asList } from '../utils/memory';
import Logo from '../components/Logo';
import { Button, Field, GlassCard, cx } from '../components/ui';

const GOALS = [
  'Pass an upcoming exam',
  'Learn a language',
  'Master my degree coursework',
  'Build long-term professional knowledge',
];

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const { learner, login, toast, checking } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [form, setForm] = useState({ name: '', email: '', goal: GOALS[0], daily_target: 15, starter_pack: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Already signed in? Go straight to the dashboard.
  useEffect(() => {
    if (!checking && learner) navigate('/dashboard', { replace: true });
  }, [checking, learner, navigate]);

  const enterDemo = async () => {
    setBusy(true);
    setError('');
    try {
      const list = asList(await api.getLearners(), 'learners');
      const demo = list.find((l) => l.id === 'l_demo') || list[0];
      if (!demo) throw new Error('No learners found. Create a profile first.');
      login(demo);
      navigate('/dashboard');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (params.get('demo') === '1' && !checking && !learner) enterDemo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, checking]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isSignup) {
        if (!form.name.trim()) throw new Error('Please enter your name.');
        if (!/^\S+@\S+\.\S+$/.test(form.email)) throw new Error('Enter a valid email address.');
        const created = await api.createLearner({
          name: form.name.trim(), email: form.email.trim().toLowerCase(), goal: form.goal,
          daily_target: form.daily_target, starter_pack: form.starter_pack,
        });
        login({ ...created, name: created.name || form.name.trim(), email: created.email || form.email.trim().toLowerCase() });
        toast(`Welcome to Memora, ${form.name.trim().split(' ')[0]}.`);
      } else {
        const list = asList(await api.getLearners(), 'learners');
        const found = list.find((l) => (l.email || '').toLowerCase() === form.email.trim().toLowerCase());
        if (!found) throw new Error('No learner found with that email. Sign up to create a profile.');
        login(found);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between p-12 lg:flex">
        <Link to="/" aria-label="Memora home"><Logo /></Link>
        <div className="max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight">Review less. Remember more.</h2>
          <ul className="mt-8 space-y-4 text-slate-600">
            {['Reviews timed to your predicted forgetting curve', 'Health badges that show what needs attention now', 'Analytics across every subject you study'].map((t) => (
              <li key={t} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-3 w-3" aria-hidden /></span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-500">Memora 2.0</p>
      </div>

      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <GlassCard className="w-full max-w-md p-7 shadow-lift sm:p-9">
          <Link to="/" className="mb-6 inline-block lg:hidden" aria-label="Memora home"><Logo /></Link>
          <h1 className="text-2xl font-extrabold">{isSignup ? 'Create your learner profile' : 'Welcome back'}</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {isSignup ? 'Tell us what you are working toward and how much you want to review each day.' : 'Log in with the email you signed up with. No password is needed in this build.'}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {isSignup && (
              <Field label="Full name" htmlFor="name">
                <input id="name" className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Aghilan M" autoComplete="name" required />
              </Field>
            )}
            <Field label="Email" htmlFor="email">
              <input id="email" type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" autoComplete="email" required />
            </Field>

            {isSignup && (
              <>
                <Field label="Learning goal" htmlFor="goal">
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Learning goal">
                    {GOALS.map((g) => (
                      <button
                        type="button" key={g} role="radio" aria-checked={form.goal === g} onClick={() => set('goal', g)}
                        className={cx('rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors', form.goal === g ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}
                      >{g}</button>
                    ))}
                  </div>
                </Field>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="label !mb-0" htmlFor="target">Daily target reviews</label>
                    <span className="num rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">{form.daily_target} per day</span>
                  </div>
                  <input id="target" type="range" min={5} max={50} step={5} value={form.daily_target} onChange={(e) => set('daily_target', Number(e.target.value))} className="slider" style={{ '--fill': `${((form.daily_target - 5) / 45) * 100}%` }} />
                  <div className="num mt-1.5 flex justify-between text-[11px] text-slate-400"><span>5</span><span>50</span></div>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
                  <input type="checkbox" checked={form.starter_pack} onChange={(e) => set('starter_pack', e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600" />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">Start with sample subjects</span>
                    <span className="block text-xs text-slate-500">Adds computer science, medicine, law and language topics with questions so the dashboard is not empty. Available on the demo backend.</span>
                  </span>
                </label>
              </>
            )}

            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>}

            <Button type="submit" variant="dark" className="w-full" loading={busy}>{isSignup ? 'Create profile' : 'Log in'}</Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div>
          <Button type="button" variant="ghost" className="w-full" onClick={enterDemo} disabled={busy}>
            <Sparkles className="h-4 w-4 text-indigo-600" aria-hidden /> Continue with the demo learner
          </Button>

          <p className="mt-6 text-center text-sm text-slate-500">
            {isSignup ? 'Already have a profile? ' : 'New to Memora? '}
            <Link to={isSignup ? '/login' : '/signup'} className="font-semibold text-indigo-600 hover:text-indigo-700">{isSignup ? 'Log in' : 'Create one'}</Link>
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
