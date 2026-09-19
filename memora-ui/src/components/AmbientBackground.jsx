// Fixed ambient glow orbs behind every screen (see design tokens in index.css).
export default function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="orb-tl absolute -inset-[10%] animate-drift" />
      <div className="orb-r absolute -inset-[10%] animate-drift-alt" />
    </div>
  );
}
