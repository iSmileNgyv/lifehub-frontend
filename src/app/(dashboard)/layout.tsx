import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { RequireAuth } from '@/components/auth/guards';
import { ContentLanguagesProvider } from '@/contexts/ContentLanguagesContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <ContentLanguagesProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-950">
            {children}
          </main>
        </div>
      </div>
      </ContentLanguagesProvider>
    </RequireAuth>
  );
}
