import { BookOpen, Cpu, Languages, Scale, Stethoscope } from 'lucide-react';

// Full class strings so Tailwind can see them at build time.
export const SUBJECT_THEMES = {
  indigo: { name: 'Indigo', soft: 'bg-indigo-50 text-indigo-700 ring-indigo-200', solid: 'bg-indigo-500', hex: '#6366f1' },
  rose: { name: 'Rose', soft: 'bg-rose-50 text-rose-700 ring-rose-200', solid: 'bg-rose-500', hex: '#f43f5e' },
  amber: { name: 'Amber', soft: 'bg-amber-50 text-amber-700 ring-amber-200', solid: 'bg-amber-500', hex: '#f59e0b' },
  emerald: { name: 'Emerald', soft: 'bg-emerald-50 text-emerald-700 ring-emerald-200', solid: 'bg-emerald-500', hex: '#10b981' },
  sky: { name: 'Sky', soft: 'bg-sky-50 text-sky-700 ring-sky-200', solid: 'bg-sky-500', hex: '#0ea5e9' },
  violet: { name: 'Violet', soft: 'bg-violet-50 text-violet-700 ring-violet-200', solid: 'bg-violet-500', hex: '#8b5cf6' },
  slate: { name: 'Slate', soft: 'bg-slate-100 text-slate-700 ring-slate-200', solid: 'bg-slate-500', hex: '#64748b' },
};

export const CATEGORIES = [
  { id: 'Computer Science', icon: Cpu, color: 'indigo' },
  { id: 'Medical', icon: Stethoscope, color: 'rose' },
  { id: 'Law', icon: Scale, color: 'amber' },
  { id: 'Languages', icon: Languages, color: 'emerald' },
  { id: 'Other', icon: BookOpen, color: 'slate' },
];

export const categoryMeta = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
export const themeOf = (color) => SUBJECT_THEMES[color] || SUBJECT_THEMES.indigo;

// Palette used for multi-series charts.
export const CHART_COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6', '#64748b'];
export const HEALTH_HEX = { STABLE: '#10b981', WEAK: '#f59e0b', CRITICAL: '#f43f5e' };
