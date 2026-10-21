import Link from 'next/link';
import { ObjectId } from 'mongodb';
import { notFound, redirect } from 'next/navigation';
import { getDatabase } from '@/lib/mongodb';
import { getViewer } from '@/lib/viewer';
import TourDetailPlan from './tour-detail-plan';

export const runtime = 'nodejs';

type Tour = {
  name: string;
  agencyId?: ObjectId | null;
  guideId?: ObjectId | null;
  startDate: Date;
  endDate: Date;
  type: 'corporate' | 'individual';
  dayPlans?: { date: string; visits: { placeId: string; startTime: string }[] }[];
};

const dateFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export default async function TourDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect('/');
  if (!viewer.isAdmin && !viewer.agencyId) redirect('/dashboard/profile');

  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const db = await getDatabase();
  const tour = await db.collection<Tour>('tours').findOne({
    _id: new ObjectId(id),
    ...(viewer.isAdmin ? {} : { createdByAgencyId: viewer.agencyId! }),
  });
  if (!tour) notFound();

  const [agency, guide] = await Promise.all([
    tour.agencyId ? db.collection<{ name: string }>('agencies').findOne({ _id: tour.agencyId }, { projection: { name: 1 } }) : null,
    tour.guideId ? db.collection<{ firstName: string; lastName: string }>('guides').findOne({ _id: tour.guideId }, { projection: { firstName: 1, lastName: 1 } }) : null,
  ]);

  return <div className="tour-edit-page tour-detail-page">
    <Link className="guide-card-back" href="/dashboard/tours"><span aria-hidden="true">←</span> Turlara dön</Link>
    <div className="tour-detail-title-row"><h1>{tour.name}</h1><Link className="add-user-button tour-detail-edit" href={`/dashboard/tours/${id}/edit`}>Turu Düzenle</Link></div>
    <section className="tour-edit-card" aria-label="Tur bilgileri">
      <div className="tour-edit-card-heading"><h2>Tur Bilgileri</h2></div>
      <dl className="tour-detail-fields">
        <div><dt>Acente</dt><dd>{agency?.name || 'Atanmadı'}</dd></div>
        <div><dt>Rehber</dt><dd>{guide ? `${guide.firstName} ${guide.lastName}`.trim() : 'Atanmadı'}</dd></div>
        <div><dt>Başlama Tarihi</dt><dd>{dateFormatter.format(tour.startDate)}</dd></div>
        <div><dt>Bitiş Tarihi</dt><dd>{dateFormatter.format(tour.endDate)}</dd></div>
        <div><dt>Tur Tipi</dt><dd><span className="tour-type">{tour.type === 'corporate' ? 'Kurumsal' : 'Bireysel'}</span></dd></div>
      </dl>
    </section>
    <TourDetailPlan startDate={tour.startDate.toISOString().slice(0, 10)} endDate={tour.endDate.toISOString().slice(0, 10)} dayPlans={tour.dayPlans || []} />
  </div>;
}
