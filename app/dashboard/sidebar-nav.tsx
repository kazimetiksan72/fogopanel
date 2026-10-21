'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SidebarNav({ canManage }: { canManage: boolean }) {
  const pathname = usePathname();

  return <nav className="admin-nav" aria-label="Panel bölümleri">
    {canManage && <Link className={`admin-nav-link${pathname === '/dashboard' ? ' active' : ''}`} href="/dashboard" aria-current={pathname === '/dashboard' ? 'page' : undefined}>
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
      <span>Dashboard</span>
    </Link>}
    <Link className={`admin-nav-link${pathname === '/dashboard/profile' ? ' active' : ''}`} href="/dashboard/profile" aria-current={pathname === '/dashboard/profile' ? 'page' : undefined}>
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
      <span>Profilim</span>
    </Link>
    {canManage && <><Link className={`admin-nav-link${pathname === '/dashboard/users' ? ' active' : ''}`} href="/dashboard/users" aria-current={pathname === '/dashboard/users' ? 'page' : undefined}>
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 1-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      <span>Kullanıcılar</span>
    </Link>
    <Link className={`admin-nav-link${pathname === '/dashboard/agencies' ? ' active' : ''}`} href="/dashboard/agencies" aria-current={pathname === '/dashboard/agencies' ? 'page' : undefined}>
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h1m4 0h1m-6 4h1m4 0h1M10 21v-4h4v4"/></svg>
      <span>Acenteler</span>
    </Link>
    <Link className={`admin-nav-link${pathname === '/dashboard/tours' || pathname.startsWith('/dashboard/tours/') ? ' active' : ''}`} href="/dashboard/tours" aria-current={pathname === '/dashboard/tours' ? 'page' : undefined}>
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z"/></svg>
      <span>Turlar</span>
    </Link>
    <Link className={`admin-nav-link${pathname === '/dashboard/guides' || pathname.startsWith('/dashboard/guides/') ? ' active' : ''}`} href="/dashboard/guides" aria-current={pathname === '/dashboard/guides' ? 'page' : undefined}>
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3"/><path d="M5 20v-1a7 7 0 0 1 14 0v1M7 3.5 5 6m12-2.5L19 6"/></svg>
      <span>Rehberler</span>
    </Link></>}
  </nav>;
}
