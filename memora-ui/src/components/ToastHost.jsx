import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

const STYLES = {
  success: { icon: CheckCircle2, cls: 'text-emerald-600' },
  error: { icon: XCircle, cls: 'text-rose-600' },
  info: { icon: Info, cls: 'text-indigo-600' },
};

export default function ToastHost() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" aria-live="polite">
      {toasts.map((t) => {
        const S = STYLES[t.type] || STYLES.info;
        return (
          <div key={t.id} className="pointer-events-auto flex animate-toast-in items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lift">
            <S.icon className={`mt-0.5 h-5 w-5 shrink-0 ${S.cls}`} aria-hidden />
            <p className="flex-1 text-sm font-medium text-slate-800">{t.message}</p>
            <button onClick={() => dismissToast(t.id)} className="text-slate-400 hover:text-slate-700" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
