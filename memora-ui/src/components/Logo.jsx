export function LogoMark({ className = 'h-9 w-9' }) {
  return (
    <span className={`grid place-items-center rounded-xl bg-gradient-to-br from-royal-600 to-royal-500 shadow-[0_8px_18px_-6px_rgba(79,70,229,0.6)] ${className}`}>
      <svg viewBox="0 0 64 64" className="h-[62%] w-[62%]" fill="none" aria-hidden>
        <path d="M10 46 C 22 46, 24 18, 34 18 S 48 40, 54 42" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
        <circle cx="34" cy="18" r="6" fill="#fff" />
      </svg>
    </span>
  );
}

export default function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="text-lg font-extrabold tracking-tight text-obsidian">
        Memora <span className="ml-0.5 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">2.0</span>
      </span>
    </span>
  );
}
