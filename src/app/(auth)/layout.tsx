import { RedirectIfAuth } from '@/components/auth/guards';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <RedirectIfAuth>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d1f3c] via-[#112d54] to-[#1a3f6f] p-4">
        {children}
      </div>
    </RedirectIfAuth>
  );
}
