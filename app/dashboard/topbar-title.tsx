'use client';

import { usePathname } from 'next/navigation';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/users': 'Kullanıcılar',
  '/dashboard/profile': 'Profilim',
  '/dashboard/agencies': 'Acenteler',
  '/dashboard/tours': 'Turlar',
  '/dashboard/guides': 'Rehberler',
};

export default function TopbarTitle() {
  const pathname = usePathname();
  const title = pathname.startsWith('/dashboard/tours/') && pathname.endsWith('/edit') ? 'Tur Düzenle'
    : pathname.startsWith('/dashboard/guides/') && pathname.endsWith('/card') ? 'Rehber Kimlik Kartı'
      : titles[pathname] || 'FOGO';
  return <h1 className="admin-topbar-title">{title}</h1>;
}
