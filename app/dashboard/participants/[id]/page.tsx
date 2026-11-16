import Link from 'next/link';
import { ObjectId } from 'mongodb';
import { notFound, redirect } from 'next/navigation';
import { getDatabase } from '@/lib/mongodb';
import { getViewer, SYSTEM_ADMIN_EMAIL } from '@/lib/viewer';

export const runtime = 'nodejs';

type Participant = { fullName?: string; name?: string; phone?: string; phoneNormalized?: string };
type Tour = { name: string; startDate?: Date; endDate?: Date };

const dateFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

function formatTourDate(startDate?: Date, endDate?: Date) {
  if (!startDate) return 'Tarih belirtilmedi';
  const start = dateFormatter.format(startDate);
  if (!endDate || startDate.getTime() === endDate.getTime()) return start;
  return `${start} – ${dateFormatter.format(endDate)}`;
}

export default async function ParticipantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect('/');
  if (!viewer.isAdmin || viewer.email !== SYSTEM_ADMIN_EMAIL) redirect('/dashboard/profile');

  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();
  const db = await getDatabase();
  const participantId = new ObjectId(id);
  const participant = await db.collection<Participant>('participants').findOne({ _id: participantId });
  if (!participant) notFound();

  const links = await db.collection<{ tourId: ObjectId; participantId: ObjectId | string; createdAt?: Date }>('tourParticipants')
    .find({ participantId: { $in: [participantId, id] } }).sort({ createdAt: -1, _id: -1 }).toArray();
  const tourIds = [...new Map(links.map((link) => [String(link.tourId), link.tourId])).values()];
  const tours = tourIds.length ? await db.collection<Tour>('tours').find({ _id: { $in: tourIds } }, {
    projection: { name: 1, startDate: 1, endDate: 1 },
  }).toArray() : [];
  const toursById = new Map(tours.map((tour) => [tour._id.toString(), tour]));
  const previousTours = links.map((link) => ({ tour: toursById.get(String(link.tourId)), id: String(link.tourId) }))
    .filter((item): item is { tour: Tour & { _id: ObjectId }; id: string } => Boolean(item.tour));

  return <div className="users-page participant-detail-page">
    <Link className="guide-card-back" href="/dashboard/participants"><span aria-hidden="true">←</span> Katılımcılara dön</Link>
    <div className="participant-detail-title"><h1>{participant.fullName || participant.name || 'İsimsiz katılımcı'}</h1></div>
    <section className="tour-edit-card" aria-label="Katılımcı bilgileri">
      <div className="tour-edit-card-heading"><h2>Katılımcı Bilgileri</h2></div>
      <dl className="tour-detail-fields participant-detail-fields">
        <div><dt>Ad Soyad</dt><dd>{participant.fullName || participant.name || '—'}</dd></div>
        <div><dt>Telefon Numarası</dt><dd>{participant.phone || participant.phoneNormalized || '—'}</dd></div>
      </dl>
    </section>
    <section className="tour-participants-card participant-tour-card" aria-labelledby="participant-tours-title">
      <div className="tour-participants-heading"><div><h2 id="participant-tours-title">Katıldığı Turlar</h2><span>{previousTours.length} tur</span></div></div>
      {previousTours.length ? <div className="users-table-wrap"><table className="users-table participant-tours-table">
        <thead><tr><th>TUR ADI</th><th>TARİH</th></tr></thead>
        <tbody>{previousTours.map(({ tour, id: tourId }) => <tr key={tourId}>
          <td className="table-primary"><Link className="tour-name-link" href={`/dashboard/tours/${tourId}`}>{tour.name}</Link></td>
          <td>{formatTourDate(tour.startDate, tour.endDate)}</td>
        </tr>)}</tbody>
      </table></div> : <div className="users-empty participant-tours-empty"><span>◇</span><h3>Henüz tur yok</h3><p>Bu katılımcının geçmiş tur kaydı bulunmuyor.</p></div>}
    </section>
  </div>;
}
