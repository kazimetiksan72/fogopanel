import { redirect } from 'next/navigation';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { getViewer } from '@/lib/viewer';
import { SYSTEM_ADMIN_EMAIL } from '@/lib/viewer';
import AddUserButton from '../user-form';
import UserEditButton from '../user-edit-button';

export const runtime = 'nodejs';

type AdminUser = {
  email: string;
  firstName?: string;
  lastName?: string;
  active?: boolean;
  agencyId?: ObjectId;
  createdAt?: Date;
};

type Agency = { name: string };

export default async function UsersPage() {
  const viewer = await getViewer();
  if (!viewer) redirect('/');
  if (!viewer.isAdmin && !viewer.agencyId) redirect('/dashboard/profile');
  const db = await getDatabase();
  const users = await db.collection<AdminUser>('admins')
    .find(viewer.isAdmin ? {} : { agencyId: viewer.agencyId! }, { projection: { email: 1, firstName: 1, lastName: 1, agencyId: 1, active: 1, createdAt: 1 } })
    .sort({ createdAt: -1, email: 1 })
    .toArray();
  const agencies = await db.collection<Agency>('agencies')
    .find(viewer.isAdmin ? {} : { _id: viewer.agencyId! }, { projection: { name: 1 } })
    .sort({ name: 1 })
    .toArray();
  const agencyOptions = agencies.map((agency) => ({ id: agency._id.toString(), name: agency.name }));
  const agencyNames = new Map(agencyOptions.map((agency) => [agency.id, agency.name]));

  return (
    <div className="users-page">
      <AddUserButton agencies={agencyOptions} lockedAgencyId={viewer.agencyId?.toString()} />
      <section className="users-card" aria-label="Kullanıcı listesi">
        {users.length ? (
          <div className="users-table-wrap">
            <table className={viewer.isAdmin ? 'users-table users-list-table' : 'users-table'}>
              <thead><tr><th>AD SOYAD</th><th>E-POSTA</th><th>ACENTE</th>{viewer.isAdmin && <th>İŞLEM</th>}</tr></thead>
              <tbody>{users.map((user) => {
                const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
                return <tr key={user._id.toString()}>
                  <td className="table-primary">{fullName || '—'}</td>
                  <td className="user-email">{user.email}</td>
                  <td className="user-email">{user.agencyId ? agencyNames.get(user.agencyId.toString()) || '—' : '—'}</td>
                  {viewer.isAdmin && <td><UserEditButton user={{ id: user._id.toString(), firstName: user.firstName || '', lastName: user.lastName || '', email: user.email, agencyId: user.agencyId?.toString() || '', active: user.active !== false, isSystemAdmin: user.email === SYSTEM_ADMIN_EMAIL }} agencies={agencyOptions} /></td>}
                </tr>;
              })}</tbody>
            </table>
          </div>
        ) : <div className="users-empty"><span>◎</span><h3>Henüz kullanıcı yok</h3><p>İlk kullanıcıyı eklemek için sağ üstteki butonu kullanın.</p></div>}
      </section>
    </div>
  );
}
