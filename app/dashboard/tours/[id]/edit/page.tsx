import { ObjectId } from 'mongodb';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getDatabase } from '@/lib/mongodb';
import { getViewer } from '@/lib/viewer';
import TourEditForm from './tour-edit-form';

export const runtime = 'nodejs';

type Tour = {
  name: string;
  agencyId?: ObjectId | null;
  startDate: Date;
  endDate: Date;
  type: 'corporate' | 'individual';
  dayPlans?: { date: string; visits: { placeId: string; startTime: string }[] }[];
};

export default async function TourEditPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect('/');
  if (!viewer.isAdmin && !viewer.agencyId) redirect('/dashboard/profile');

  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const db = await getDatabase();
  const tour = await db.collection<Tour>('tours').findOne({
    _id: new ObjectId(id),
    ...(viewer.isAdmin ? {} : { agencyId: viewer.agencyId! }),
  });
  if (!tour) notFound();

  const agencies = await db.collection<{ name: string }>('agencies')
    .find(viewer.isAdmin ? {} : { _id: viewer.agencyId! }, { projection: { name: 1 } })
    .sort({ name: 1 })
    .toArray();

  return <div className="tour-edit-page">
    <Link className="guide-card-back" href="/dashboard/tours"><span aria-hidden="true">←</span> Turlara dön</Link>
    <TourEditForm
      id={id}
      initial={{
        name: tour.name,
        agencyId: tour.agencyId?.toString() || '',
        startDate: tour.startDate.toISOString().slice(0, 10),
        endDate: tour.endDate.toISOString().slice(0, 10),
        type: tour.type,
      }}
      agencies={agencies.map((agency) => ({ id: agency._id.toString(), name: agency.name }))}
      lockedAgencyId={viewer.agencyId?.toString()}
      initialDayPlans={tour.dayPlans || []}
    />
  </div>;
}
