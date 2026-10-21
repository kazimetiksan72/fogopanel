import { redirect } from 'next/navigation';
import { getDatabase } from '@/lib/mongodb';
import { getViewer } from '@/lib/viewer';

export const runtime = 'nodejs';

export default async function DashboardPage() {
  const viewer = await getViewer();
  if (!viewer) redirect('/');
  if (!viewer.isAdmin && !viewer.agencyId) redirect('/dashboard/profile');

  const db = await getDatabase();
  const agencyFilter = viewer.isAdmin ? {} : { agencyId: viewer.agencyId! };
  const [tourCount, userCount, agencyCount] = await Promise.all([
    db.collection('tours').countDocuments(viewer.isAdmin ? {} : { createdByAgencyId: viewer.agencyId! }),
    db.collection('admins').countDocuments(agencyFilter),
    db.collection('agencies').countDocuments(viewer.isAdmin ? {} : { _id: viewer.agencyId! }),
  ]);

  const stats = [
    { label: 'Tur sayısı', count: tourCount },
    { label: 'Kullanıcı sayısı', count: userCount },
    { label: 'Acente sayısı', count: agencyCount },
  ];

  return <section className="dashboard-stats" aria-label="Genel bilgiler">
    {stats.map(({ label, count }) => <article className="dashboard-stat-card" key={label}>
      <span className="dashboard-stat-label">{label}</span>
      <strong className="dashboard-stat-value">{count.toLocaleString('tr-TR')}</strong>
    </article>)}
  </section>;
}
