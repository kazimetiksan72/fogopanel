import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/viewer';
import BrandLogo from '@/components/brand-logo';
import SignOutButton from './signout-button';
import SidebarNav from './sidebar-nav';
import TopbarTitle from './topbar-title';
import './dashboard.css';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect('/');

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar-brand"><BrandLogo className="dashboard-logo" /></div>
        <div className="admin-topbar-content"><TopbarTitle /><div id="dashboard-topbar-actions" className="admin-topbar-actions" /></div>
        <div className="admin-mobile-signout"><SignOutButton /></div>
      </header>
      <div className="admin-body">
        <aside className="admin-sidebar" aria-label="Ana menü">
          <div className="admin-sidebar-top">
            <SidebarNav canManage={viewer.isAdmin || Boolean(viewer.agencyId)} />
          </div>
          <div className="admin-sidebar-bottom">
            <div className="admin-account"><span className="admin-avatar">{viewer.email[0]?.toUpperCase()}</span><span className="admin-account-email" title={viewer.email}>{viewer.email}</span></div>
            <SignOutButton />
          </div>
        </aside>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
