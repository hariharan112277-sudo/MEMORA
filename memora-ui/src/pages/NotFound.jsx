import { Button, GlassCard } from '../components/ui';
import Logo from '../components/Logo';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <GlassCard className="max-w-md p-10 text-center">
        <Logo className="mb-6" />
        <h1 className="text-3xl font-extrabold">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500">The page you're looking for doesn't exist or has moved.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button to="/dashboard" variant="dark">Go to dashboard</Button>
          <Button to="/" variant="ghost">Home</Button>
        </div>
      </GlassCard>
    </div>
  );
}
