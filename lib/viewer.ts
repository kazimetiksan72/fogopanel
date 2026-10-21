import { ObjectId } from 'mongodb';
import { getSession } from './auth';
import { getDatabase } from './mongodb';

export const SYSTEM_ADMIN_EMAIL = 'system@fogo.com.tr';

type UserRecord = {
  email: string;
  firstName?: string;
  lastName?: string;
  agencyId?: ObjectId;
  role?: 'superadmin' | 'user';
  active?: boolean;
};

export async function getViewer() {
  const session = await getSession();
  if (!session || !ObjectId.isValid(session.id)) return null;

  const db = await getDatabase();
  const user = await db.collection<UserRecord>('admins').findOne(
    { _id: new ObjectId(session.id), active: { $ne: false } },
    { projection: { email: 1, firstName: 1, lastName: 1, agencyId: 1, role: 1 } },
  );
  if (!user) return null;

  const agencyId = user.agencyId instanceof ObjectId ? user.agencyId : null;
  return {
    id: user._id,
    email: user.email,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    agencyId,
    isAdmin: user.email === SYSTEM_ADMIN_EMAIL && user.role === 'superadmin' && !agencyId,
  };
}
