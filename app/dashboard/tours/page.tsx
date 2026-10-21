import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Filter, ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { getViewer } from '@/lib/viewer';
import { LIST_PAGE_SIZE, pageForTotal, readListQuery, searchTerms, type ListSearchParams } from '@/lib/list-query';
import { ListPagination, ListSearch } from '../list-controls';
import TourForm from './tour-form';

export const runtime = 'nodejs';

type Agency = { name: string };
type Tour = { name: string; agencyId?: ObjectId | null; startDate: Date; endDate: Date; type: 'corporate' | 'individual'; createdAt?: Date };

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(date);
}

export default async function ToursPage({ searchParams }: { searchParams: ListSearchParams }) {
  const viewer = await getViewer();
  if (!viewer) redirect('/');
  if (!viewer.isAdmin && !viewer.agencyId) redirect('/dashboard/profile');
  const { query, requestedPage } = readListQuery(await searchParams);
  const db = await getDatabase();
  const agencies = await db.collection<Agency>('agencies')
    .find(viewer.isAdmin ? {} : { _id: viewer.agencyId! }, { projection: { name: 1 } })
    .sort({ name: 1 })
    .toArray();
  const agencyOptions = agencies.map((agency) => ({ id: agency._id.toString(), name: agency.name }));
  const agencyNames = new Map(agencyOptions.map((agency) => [agency.id, agency.name]));
  const filter: Filter<Tour> = viewer.isAdmin ? {} : { createdByAgencyId: viewer.agencyId! };
  if (query) filter.$and = searchTerms(query).map((term) => ({ $or: [
    { name: term },
    { agencyId: { $in: agencies.filter((agency) => term.test(agency.name)).map((agency) => agency._id) } },
    ...(term.test('Kurumsal') ? [{ type: 'corporate' as const }] : []),
    ...(term.test('Bireysel') ? [{ type: 'individual' as const }] : []),
  ] }));
  const toursCollection = db.collection<Tour>('tours');
  const total = await toursCollection.countDocuments(filter);
  const page = pageForTotal(requestedPage, total);
  const tours = await toursCollection.find(filter)
    .sort({ startDate: -1, createdAt: -1, _id: -1 })
    .skip((page - 1) * LIST_PAGE_SIZE).limit(LIST_PAGE_SIZE).toArray();

  return <div className="users-page">
    <TourForm agencies={agencyOptions} lockedAgencyId={viewer.agencyId?.toString()} />
    <ListSearch path="/dashboard/tours" query={query} placeholder="Tur ara" total={total} />
    <section className="users-card" aria-label="Tur listesi">
      {tours.length ? <div className="users-table-wrap"><table className="users-table tours-table">
        <thead><tr><th>TUR ADI</th><th>ACENTE</th><th>BAŞLAMA</th><th>BİTİŞ</th><th>TUR TİPİ</th><th>İŞLEM</th></tr></thead>
        <tbody>{tours.map((tour) => <tr key={tour._id.toString()}>
          <td className="table-primary">{tour.name}</td>
          <td>{agencyNames.get(tour.agencyId?.toString() || '') || '—'}</td>
          <td>{formatDate(tour.startDate)}</td>
          <td>{formatDate(tour.endDate)}</td>
          <td><span className="tour-type">{tour.type === 'corporate' ? 'Kurumsal' : 'Bireysel'}</span></td>
          <td><Link className="edit-icon-button" href={`/dashboard/tours/${tour._id.toString()}/edit`} aria-label={`${tour.name} turunu düzenle`} title="Turu düzenle"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4L16.5 3.5Z"/></svg></Link></td>
        </tr>)}</tbody>
      </table></div> : <div className="users-empty"><span>◇</span><h3>{query ? 'Sonuç bulunamadı' : 'Henüz tur yok'}</h3><p>{query ? 'Arama terimini değiştirip tekrar deneyin.' : 'İlk turu eklemek için sağ üstteki butonu kullanın.'}</p></div>}
      <ListPagination path="/dashboard/tours" query={query} page={page} total={total} />
    </section>
  </div>;
}
