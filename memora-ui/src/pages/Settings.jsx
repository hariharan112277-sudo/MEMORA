import { useState } from 'react';
import { AlertTriangle, Cloud, FastForward, RotateCcw, Save } from 'lucide-react';
import { DEFAULT_NOTIFICATIONS, useApp } from '../context/AppContext';
import { getApiBase } from '../services/api';
import { Button, Field, GlassCard, Modal, PageHeader, Toggle } from '../components/ui';

const NOTIFICATIONS = [
  ['daily_reminder', 'Daily review reminder', 'A nudge at your chosen time when reviews are due.'],
  ['weak_alerts', 'Weak and critical alerts', 'Tell me when a topic drops below 80% retention.'],
  ['streak_warning', 'Streak warnings', 'Warn me before I lose a study streak.'],
  ['weekly_report', 'Weekly progress report', 'A summary of reviews, accuracy and retention each week.'],
];

export default function Settings() {
  const { learner, profile, saveProfile, mode, advanceDay, resetAll, toast } = useApp();
  const [form, setForm] = useState(() => ({
    name: profile?.name || learner?.name || '',
    goal: profile?.goal || learner?.goal || '',
    daily_target: profile?.daily_target || 10,
    reminder_time: profile?.reminder_time || '19:00',
    notifications: { ...DEFAULT_NOTIFICATIONS, ...(profile?.notifications || {}) },
  }));
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const dirty = JSON.stringify(form) !== JSON.stringify(profile);

  const save = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast('Your name cannot be empty.', 'error');
    saveProfile({ ...form, name: form.name.trim() });
    toast('Settings saved.');
  };

  const skip = async (n) => {
    setBusy(`d${n}`);
    try { await advanceDay(n); } catch (e) { toast(e.message, 'error'); } finally { setBusy(null); }
  };

  const doReset = async () => {
    setBusy('reset');
    try {
      await resetAll();
      setConfirmReset(false);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your profile, daily goal and notifications." />

      <form onSubmit={save} className="space-y-6">
        <GlassCard className="p-6">
          <h2 className="text-base font-bold">Profile</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Full name" htmlFor="s-name"><input id="s-name" className="input" value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Email" htmlFor="s-email" hint="Email is set when you sign up."><input id="s-email" className="input bg-slate-50 text-slate-500" value={learner?.email || ''} readOnly /></Field>
            <div className="sm:col-span-2">
              <Field label="Learning goal" htmlFor="s-goal"><input id="s-goal" className="input" value={form.goal} onChange={(e) => set('goal', e.target.value)} placeholder="What are you working toward?" /></Field>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold">Daily target reviews</h2>
              <p className="mt-0.5 text-xs text-slate-500">How many questions you aim to answer each day.</p>
            </div>
            <span className="num rounded-full bg-indigo-50 px-3.5 py-1 text-sm font-extrabold text-indigo-700">{form.daily_target}</span>
          </div>
          <input aria-label="Daily target reviews" type="range" min={5} max={50} step={5} value={form.daily_target} onChange={(e) => set('daily_target', Number(e.target.value))} className="slider mt-6" style={{ '--fill': `${((form.daily_target - 5) / 45) * 100}%` }} />
          <div className="num mt-2 flex justify-between text-[11px] text-slate-400"><span>5</span><span>25</span><span>50</span></div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-base font-bold">Notifications</h2>
          <p className="mt-0.5 text-xs text-slate-500">Preferences are stored on this device.</p>
          <div className="mt-2 divide-y divide-slate-100">
            {NOTIFICATIONS.map(([key, label, desc]) => (
              <Toggle key={key} label={label} description={desc} checked={!!form.notifications[key]} onChange={(v) => setForm((f) => ({ ...f, notifications: { ...f.notifications, [key]: v } }))} />
            ))}
          </div>
          <div className="mt-3 max-w-xs">
            <Field label="Reminder time" htmlFor="s-time"><input id="s-time" type="time" className="input" value={form.reminder_time} onChange={(e) => set('reminder_time', e.target.value)} disabled={!form.notifications.daily_reminder} /></Field>
          </div>
        </GlassCard>

        <div className="flex justify-end">
          <Button type="submit" variant="dark" disabled={!dirty}><Save className="h-4 w-4" aria-hidden /> Save changes</Button>
        </div>
      </form>

      <div className="mt-10 space-y-6">
        <GlassCard className="p-6">
          <h2 className="flex items-center gap-2 text-base font-bold"><FastForward className="h-4 w-4 text-indigo-600" aria-hidden /> Time simulation</h2>
          <p className="mt-1 text-xs text-slate-500">Advance the simulated clock to see how retention decays and which reviews become due.</p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {[1, 3, 7, 30].map((n) => (
              <Button key={n} variant="ghost" size="sm" type="button" loading={busy === `d${n}`} onClick={() => skip(n)}>+{n} day{n > 1 ? 's' : ''}</Button>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="flex items-center gap-2 text-base font-bold"><Cloud className="h-4 w-4 text-indigo-600" aria-hidden /> Data source</h2>
          <p className="mt-1 text-sm text-slate-600">
            {mode === 'live'
              ? <>Connected to the REST API at <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{getApiBase()}</code>.</>
              : <>No API was found at <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{getApiBase()}</code>, so Memora is using built-in demo data stored in this browser.</>}
          </p>
        </GlassCard>

        <GlassCard className="border-rose-200/80 p-6">
          <h2 className="flex items-center gap-2 text-base font-bold"><AlertTriangle className="h-4 w-4 text-rose-600" aria-hidden /> Reset demo data</h2>
          <p className="mt-1 text-xs text-slate-500">Restores the original demo learner, subjects, questions and history. Learners and content you created are removed.</p>
          <Button variant="danger" className="mt-4" type="button" onClick={() => setConfirmReset(true)}><RotateCcw className="h-4 w-4" aria-hidden /> Reset demo data</Button>
        </GlassCard>
      </div>

      <Modal
        open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset all demo data?"
        description="This cannot be undone."
        footer={<><Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button><Button variant="danger" onClick={doReset} loading={busy === 'reset'}>Reset demo data</Button></>}
      >
        <p className="text-sm text-slate-600">Everything you created (learners, subjects, topics, questions and review history) will be replaced with the original sample data.</p>
      </Modal>
    </>
  );
}
