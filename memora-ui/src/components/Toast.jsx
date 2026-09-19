import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

const ICON = { success: CheckCircle2, error: TriangleAlert, info: Info };
const TONE = { success: 'text-emerald-400', error: 'text-rose-400', info: 'text-indigo-300' };

export default function Toast() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2" role="status" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICON[t.type] || Info;
          return (
            <motion.div key={t.id} layout initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
              className="glass pointer-events-auto flex items-start gap-3 p-3 shadow-2xl">
              <Icon size={18} className={`mt-0.5 shrink-0 ${TONE[t.type]}`} aria-hidden />
              <p className="flex-1 text-sm text-slate-100">{t.message}</p>
              <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="text-slate-500 hover:text-white"><X size={16} /></button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
