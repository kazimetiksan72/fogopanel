import { notFound, redirect } from 'next/navigation';
import { ObjectId } from 'mongodb';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';
import ProfileForm from './profile-form';

export const runtime = 'nodejs';

type Profile = { email: string; firstName?: string; lastName?: string };

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect('/');
  if (!ObjectId.isValid(session.id)) notFound();

  const db = await getDatabase();
  const user = await db.collection<Profile>('admins').findOne(
    { _id: new ObjectId(session.id) },
    { projection: { email: 1, firstName: 1, lastName: 1 } },
  );
  if (!user) notFound();

  return <div className="profile-page">
    <section className="profile-card" aria-label="Profil bilgileri">
      <div className="profile-card-heading"><h2>Profil bilgileri</h2><p>{user.email}</p></div>
      <ProfileForm firstName={user.firstName || ''} lastName={user.lastName || ''} />
    </section>
  </div>;
}
