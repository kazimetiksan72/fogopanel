import { redirect } from 'next/navigation';
import { Filter } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { getViewer } from '@/lib/viewer';
import { LIST_PAGE_SIZE, pageForTotal, readListQuery, searchTerms, type ListSearchParams } from '@/lib/list-query';
import { ListPagination, ListSearch } from '../list-controls';
import AgencyForm from './agency-form';
import AgencyEditButton from './agency-edit-button';

export const runtime = 'nodejs';

type Agency = { name: string; taxNumber: string; address: string; createdAt?: Date };

export default async function AgenciesPage({ searchParams }: { searchParams: ListSearchParams }) {
  const viewer = await getViewer();
  if (!viewer) redirect('/');
  if (!viewer.isAdmin && !viewer.agencyId) redirect('/dashboard/profile');
  const { query, requestedPage } = readListQuery(await searchParams);
  const db = await getDatabase();
  const filter: Filter<Agency> = viewer.isAdmin ? {} : { _id: viewer.agencyId! };
  if (query) filter.$and = searchTerms(query).map((term) => ({ $or: [
    { name: term }, { taxNumber: term }, { address: term },
  ] }));
  const agenciesCollection = db.collection<Agency>('agencies');
  const total = await agenciesCollection.countDocuments(filter);
  const page = pageForTotal(requestedPage, total);
  const agencies = await agenciesCollection.find(filter)
    .sort({ createdAt: -1, name: 1, _id: -1 })
    .skip((page - 1) * LIST_PAGE_SIZE).limit(LIST_PAGE_SIZE).toArray();

  return <div className="users-page">
    {viewer.isAdmin && <AgencyForm />}
    <ListSearch path="/dashboard/agencies" query={query} placeholder="Acente ara" total={total} />
    <section className="users-card" aria-label="Acente listesi">
      {agencies.length ? <div className="users-table-wrap"><table className={viewer.isAdmin ? 'users-table agency-table agency-list-table' : 'users-table agency-table'}>
        <thead><tr><th>ACENTE ADI</th><th>VKN</th><th>ADRES</th>{viewer.isAdmin && <th>İŞLEM</th>}</tr></thead>
        <tbody>{agencies.map((agency) => <tr key={agency._id.toString()}><td className="table-primary">{agency.name}</td><td>{agency.taxNumber}</td><td className="table-address">{agency.address}</td>{viewer.isAdmin && <td><AgencyEditButton agency={{ id: agency._id.toString(), name: agency.name, taxNumber: agency.taxNumber, address: agency.address }} /></td>}</tr>)}</tbody>
      </table></div> : <div className="users-empty"><span>⌂</span><h3>{query ? 'Sonuç bulunamadı' : 'Henüz acente yok'}</h3><p>{query ? 'Arama terimini değiştirip tekrar deneyin.' : viewer.agencyId ? 'Acente kaydı bulunamadı.' : 'İlk acenteyi eklemek için sağ üstteki butonu kullanın.'}</p></div>}
      <ListPagination path="/dashboard/agencies" query={query} page={page} total={total} />
    </section>
  </div>;
}
