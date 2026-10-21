import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { getViewer } from '@/lib/viewer';
import { buildGuideVCard } from '@/lib/guide-vcard';
import GuideCardContent from '../../guide-card-content';

export const runtime = 'nodejs';

type Guide = { firstName: string; lastName: string; phone: string; updatedAt?: Date };

export default async function GuideCardPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect('/');
  if (!viewer.isAdmin && !viewer.agencyId) redirect('/dashboard/profile');

  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const db = await getDatabase();
  const guide = await db.collection<Guide>('guides').findOne({
    _id: new ObjectId(id),
    ...(viewer.isAdmin ? {} : { agencyId: viewer.agencyId! }),
  });
  if (!guide) notFound();

  return <div className="guide-card-page">
    <Link className="guide-card-back" href="/dashboard/guides"><span aria-hidden="true">←</span> Rehberlere dön</Link>
    <GuideCardContent guide={{ id, firstName: guide.firstName, lastName: guide.lastName, phone: guide.phone, photoUrl: `/api/guides/${id}/photo?v=${guide.updatedAt?.getTime() || 0}`, vcard: buildGuideVCard(guide) }} />
  </div>;
}
