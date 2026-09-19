import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Cloud, FastForward, LayoutDashboard, Library, LogOut, Menu, Settings, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Logo from './Logo';
import { Button, cx } from './ui';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/subjects', label: 'Subjects', icon: Library },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function TimeMachine() {
  const { advanceDay, toast } = useApp();
  const [busy, setBusy] = useState(null);
  const go = async (n) => {
    setBusy(n);
    try { await advanceDay(n); } catch (e) { toast(e.message, 'error'); } finally { setBusy(null); }
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-3.5">
      <p className="flex items-center gap-2 text-xs font-bold text-slate-800">
        <FastForward className="h-4 w-4 text-indigo-600" aria-hidden /> Fast-forward time
      </p>
      <p className="mt-1 text-[11px] leading-snug text-slate-500">Skip ahead to watch memories decay and reviews come due.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[1, 7].map((n) => (
          <Button key={n} size="sm" variant="ghost" loading={busy === n} onClick={() => go(n)} className="!px-3">
            +{n} day{n > 1 ? 's' : ''}
          </Button>
        ))}
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }) {
  const { learner, logout, mode } = useApp();
  return (
    <div className="flex h-full flex-col gap-6 p-5">
      <NavLink to="/dashboard" onClick={onNavigate} aria-label="Memora home"><Logo /></NavLink>

      <nav className="flex flex-col gap-1" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to} to={to} onClick={onNavigate}
            className={({ isActive }) =>
              cx('flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors',
                isActive ? 'bg-obsidian text-white shadow-pill' : 'text-slate-600 hover:bg-white hover:text-obsidian')
            }
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        <TimeMachine />
        <div className="flex items-center gap-2 rounded-xl px-1 text-[11px] font-semibold text-slate-500" title={mode === 'live' ? 'Connected to the REST API' : 'No backend found, using built-in demo data'}>
          <Cloud className="h-3.5 w-3.5" aria-hidden />
          <span className={cx('h-1.5 w-1.5 rounded-full', mode === 'live' ? 'bg-emerald-500' : 'bg-amber-500')} />
          {mode === 'live' ? 'Connected to API' : 'Demo data (local)'}
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-100 text-sm font-extrabold text-indigo-700">
            {(learner?.name || '?').trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">{learner?.name}</p>
            <p className="truncate text-[11px] text-slate-500">{learner?.email || 'Learner'}</p>
          </div>
          <button onClick={logout} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Log out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppShell() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-screen lg:pl-72">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200/80 bg-white/60 backdrop-blur-xl lg:block">
        <SidebarContent />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/75 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Logo />
        <button onClick={() => setOpen(true)} className="rounded-full p-2 text-slate-700 hover:bg-slate-100" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] animate-pop border-r border-slate-200 bg-slate-50 shadow-lift">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded-full p-2 text-slate-500 hover:bg-slate-200" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-8 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}
