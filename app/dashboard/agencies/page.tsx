import { redirect } from 'next/navigation';
import { getDatabase } from '@/lib/mongodb';
import { getViewer } from '@/lib/viewer';
import AgencyForm from './agency-form';
import AgencyEditButton from './agency-edit-button';

export const runtime = 'nodejs';

type Agency = { name: string; taxNumber: string; address: string; createdAt?: Date };

export default async function AgenciesPage() {
  const viewer = await getViewer();
  if (!viewer) redirect('/');
  if (!viewer.isAdmin && !viewer.agencyId) redirect('/dashboard/profile');
  const db = await getDatabase();
  const agencies = await db.collection<Agency>('agencies')
    .find(viewer.isAdmin ? {} : { _id: viewer.agencyId! })
    .sort({ createdAt: -1, name: 1 })
    .toArray();

  return <div className="users-page">
    {viewer.isAdmin && <AgencyForm />}
    <section className="users-card" aria-label="Acente listesi">
      {agencies.length ? <div className="users-table-wrap"><table className={viewer.isAdmin ? 'users-table agency-table agency-list-table' : 'users-table agency-table'}>
        <thead><tr><th>ACENTE ADI</th><th>VKN</th><th>ADRES</th>{viewer.isAdmin && <th>İŞLEM</th>}</tr></thead>
        <tbody>{agencies.map((agency) => <tr key={agency._id.toString()}><td className="table-primary">{agency.name}</td><td>{agency.taxNumber}</td><td className="table-address">{agency.address}</td>{viewer.isAdmin && <td><AgencyEditButton agency={{ id: agency._id.toString(), name: agency.name, taxNumber: agency.taxNumber, address: agency.address }} /></td>}</tr>)}</tbody>
      </table></div> : <div className="users-empty"><span>⌂</span><h3>Henüz acente yok</h3><p>{viewer.agencyId ? 'Acente kaydı bulunamadı.' : 'İlk acenteyi eklemek için sağ üstteki butonu kullanın.'}</p></div>}
    </section>
  </div>;
}
