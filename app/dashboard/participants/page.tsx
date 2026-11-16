import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Filter } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { getViewer, SYSTEM_ADMIN_EMAIL } from '@/lib/viewer';
import { LIST_PAGE_SIZE, pageForTotal, readListQuery, searchTerms, type ListSearchParams } from '@/lib/list-query';
import { ListPagination, ListSearch } from '../list-controls';

export const runtime = 'nodejs';

type Participant = { fullName?: string; name?: string; phone?: string; phoneNormalized?: string; createdAt?: Date };

export default async function ParticipantsPage({ searchParams }: { searchParams: ListSearchParams }) {
  const viewer = await getViewer();
  if (!viewer) redirect('/');
  if (!viewer.isAdmin || viewer.email !== SYSTEM_ADMIN_EMAIL) redirect('/dashboard/profile');

  const { query, requestedPage } = readListQuery(await searchParams);
  const db = await getDatabase();
  const filter: Filter<Participant> = {};
  if (query) filter.$and = searchTerms(query).map((term) => ({ $or: [
    { fullName: term }, { name: term }, { phone: term }, { phoneNormalized: term },
  ] }));
  const participantsCollection = db.collection<Participant>('participants');
  const total = await participantsCollection.countDocuments(filter);
  const page = pageForTotal(requestedPage, total);
  const participants = await participantsCollection.find(filter).sort({ fullName: 1, name: 1, _id: 1 })
    .skip((page - 1) * LIST_PAGE_SIZE).limit(LIST_PAGE_SIZE).toArray();

  return <div className="users-page">
    <div className="users-page-heading"><div><h1>Katılımcılar</h1><p>Veritabanındaki tüm katılımcılar</p></div></div>
    <ListSearch path="/dashboard/participants" query={query} placeholder="Katılımcı ara" total={total} />
    <section className="users-card" aria-label="Katılımcı listesi">
      {participants.length ? <div className="users-table-wrap"><table className="users-table participants-table">
        <thead><tr><th>AD SOYAD</th><th>TELEFON NUMARASI</th><th>İŞLEM</th></tr></thead>
        <tbody>{participants.map((participant) => <tr key={participant._id.toString()}>
          <td className="table-primary">{participant.fullName || participant.name || 'İsimsiz katılımcı'}</td>
          <td>{participant.phone || participant.phoneNormalized || '—'}</td>
          <td><Link className="participant-detail-link" href={`/dashboard/participants/${participant._id.toString()}`}>Detayları gör <span aria-hidden="true">→</span></Link></td>
        </tr>)}</tbody>
      </table></div> : <div className="users-empty"><span>◇</span><h3>{query ? 'Sonuç bulunamadı' : 'Henüz katılımcı yok'}</h3><p>{query ? 'Arama terimini değiştirip tekrar deneyin.' : 'Katılımcılar kayıt olduğunda burada listelenir.'}</p></div>}
      <ListPagination path="/dashboard/participants" query={query} page={page} total={total} />
    </section>
  </div>;
}
