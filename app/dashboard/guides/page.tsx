import { redirect } from 'next/navigation';
import { Filter, ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { getViewer } from '@/lib/viewer';
import { buildGuideVCard } from '@/lib/guide-vcard';
import { LIST_PAGE_SIZE, pageForTotal, readListQuery, searchTerms, type ListSearchParams } from '@/lib/list-query';
import { ListPagination, ListSearch } from '../list-controls';
import GuideForm from './guide-form';
import GuideEditButton from './guide-edit-button';
import GuideCardButton from './guide-card-button';

export const runtime = 'nodejs';

type Guide = {
  firstName: string;
  lastName: string;
  phone: string;
  photoBlobName: string;
  agencyId?: ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export default async function GuidesPage({ searchParams }: { searchParams: ListSearchParams }) {
  const viewer = await getViewer();
  if (!viewer) redirect('/');
  if (!viewer.isAdmin && !viewer.agencyId) redirect('/dashboard/profile');
  const { query, requestedPage } = readListQuery(await searchParams);

  const db = await getDatabase();
  const filter: Filter<Guide> = viewer.isAdmin ? {} : { agencyId: viewer.agencyId! };
  if (query) filter.$and = searchTerms(query).map((term) => ({ $or: [
    { firstName: term }, { lastName: term }, { phone: term },
  ] }));
  const guidesCollection = db.collection<Guide>('guides');
  const total = await guidesCollection.countDocuments(filter);
  const page = pageForTotal(requestedPage, total);
  const guides = await guidesCollection.find(filter)
    .sort({ createdAt: -1, lastName: 1, _id: -1 })
    .skip((page - 1) * LIST_PAGE_SIZE).limit(LIST_PAGE_SIZE).toArray();

  return <div className="users-page">
    <GuideForm />
    <ListSearch path="/dashboard/guides" query={query} placeholder="Rehber ara" total={total} />
    <section className="users-card" aria-label="Rehber listesi">
      {guides.length ? <div className="users-table-wrap"><table className="users-table guides-table guide-list-table">
        <thead><tr><th>FOTOĞRAF</th><th>AD</th><th>SOYAD</th><th>TELEFON</th><th>İŞLEM</th></tr></thead>
        <tbody>{guides.map((guide) => {
          const photoUrl = `/api/guides/${guide._id.toString()}/photo?v=${guide.updatedAt?.getTime() || 0}`;
          return <tr key={guide._id.toString()}>
          <td><img className="guide-table-photo" src={photoUrl} alt={`${guide.firstName} ${guide.lastName}`} width="48" height="48" /></td>
          <td className="table-primary">{guide.firstName}</td>
          <td>{guide.lastName}</td>
          <td><a className="guide-phone-link" href={`tel:${guide.phone.replace(/[^+\d]/g, '')}`}>{guide.phone}</a></td>
          <td><div className="guide-row-actions">
            <GuideCardButton guide={{ id: guide._id.toString(), firstName: guide.firstName, lastName: guide.lastName, phone: guide.phone, photoUrl, vcard: buildGuideVCard(guide) }} />
            <GuideEditButton guide={{ id: guide._id.toString(), firstName: guide.firstName, lastName: guide.lastName, phone: guide.phone, photoUrl }} />
          </div></td>
        </tr>})}</tbody>
      </table></div> : <div className="users-empty"><span>◎</span><h3>{query ? 'Sonuç bulunamadı' : 'Henüz rehber yok'}</h3><p>{query ? 'Arama terimini değiştirip tekrar deneyin.' : 'İlk rehberi eklemek için sağ üstteki butonu kullanın.'}</p></div>}
      <ListPagination path="/dashboard/guides" query={query} page={page} total={total} />
    </section>
  </div>;
}
