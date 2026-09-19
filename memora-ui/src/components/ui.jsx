import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { healthOf } from '../utils/memory';

export const cx = (...parts) => parts.filter(Boolean).join(' ');

/* ---------- Buttons ---------- */
export function Button({ variant = 'dark', size = 'md', to, className = '', loading, children, ...rest }) {
  const v = { dark: 'btn-dark', indigo: 'btn-indigo', ghost: 'btn-ghost', danger: 'btn-danger' }[variant] || 'btn-dark';
  const s = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  const cls = cx('btn', v, s, className);
  if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>;
  return (
    <button className={cls} disabled={loading || rest.disabled} {...rest}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/* ---------- Surfaces ---------- */
export function GlassCard({ as: Tag = 'div', className = '', children, ...rest }) {
  return <Tag className={cx('glass-card', className)} {...rest}>{children}</Tag>;
}

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back}
        <h1 className="text-3xl font-extrabold sm:text-[2rem]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ title, hint, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-bold">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Health badge ---------- */
const HEALTH_STYLES = {
  STABLE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  WEAK: 'bg-amber-50 text-amber-700 border-amber-200',
  CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200',
};
const HEALTH_DOT = { STABLE: 'bg-emerald-500', WEAK: 'bg-amber-500', CRITICAL: 'bg-rose-500' };

export function HealthBadge({ retention, health, className = '' }) {
  const h = health || healthOf(retention);
  return (
    <span className={cx('badge', HEALTH_STYLES[h], className)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', HEALTH_DOT[h])} aria-hidden />
      {h}
    </span>
  );
}

export function retentionTone(retention) {
  const h = healthOf(retention);
  return { STABLE: 'bg-emerald-500', WEAK: 'bg-amber-500', CRITICAL: 'bg-rose-500' }[h];
}

export function ProgressBar({ value, className = '', tone, label }) {
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div
      className={cx('h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80', className)}
      role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label={label}
    >
      <div className={cx('h-full rounded-full transition-[width] duration-500', tone || retentionTone(v))} style={{ width: `${v * 100}%` }} />
    </div>
  );
}

/* ---------- KPI card ---------- */
export function KpiCard({ label, value, hint, icon: Icon, tone = 'indigo' }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    sky: 'bg-sky-50 text-sky-600',
  };
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        {Icon && (
          <span className={cx('grid h-9 w-9 place-items-center rounded-xl', tones[tone])}>
            <Icon className="h-[18px] w-[18px]" aria-hidden />
          </span>
        )}
      </div>
      <p className="num mt-3 text-[1.9rem] font-extrabold leading-none text-obsidian">{value}</p>
      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </GlassCard>
  );
}

/* ---------- Feedback states ---------- */
export function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-16 text-sm text-slate-500" role="status">
      <Loader2 className="h-5 w-5 animate-spin text-indigo-500" aria-hidden />
      {label}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <GlassCard className="flex flex-col items-center px-6 py-12 text-center">
      {Icon && (
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
      )}
      <h3 className="text-lg font-bold">{title}</h3>
      {body && <p className="mt-1.5 max-w-md text-sm text-slate-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </GlassCard>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <GlassCard className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="text-lg font-bold">Couldn't load this page</h3>
      <p className="mt-1.5 max-w-md text-sm text-slate-500">{error?.message || 'Something went wrong.'}</p>
      {onRetry && <Button className="mt-5" variant="dark" onClick={onRetry}>Try again</Button>}
    </GlassCard>
  );
}

/* ---------- Form helpers ---------- */
export function Field({ label, hint, children, htmlFor }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      <button
        type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
        className={cx('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-indigo-600' : 'bg-slate-300')}
      >
        <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, description, children, footer, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className={cx('relative flex max-h-[92vh] w-full animate-pop flex-col rounded-t-3xl border border-slate-200 bg-white shadow-lift sm:rounded-3xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-extrabold">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close dialog">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="thin-scroll overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function BackLink({ to, children }) {
  return (
    <Link to={to} className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600">
      <span aria-hidden>‹</span> {children}
    </Link>
  );
}
