import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ensureParticipantIndexes, findParticipantsByPhone, getOrCreateParticipant, PARTICIPANTS_PAGE_SIZE, toParticipantDto, type ParticipantRecord } from '@/lib/participants';
import { normalizePhone } from '@/lib/mobile-auth';
import { getViewer } from '@/lib/viewer';

export const runtime = 'nodejs';

async function getAuthorizedTour(id: string, viewer: NonNullable<Awaited<ReturnType<typeof getViewer>>>) {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDatabase();
  const tour = await db.collection('tours').findOne({
    _id: new ObjectId(id),
    ...(viewer.isAdmin ? {} : { createdByAgencyId: viewer.agencyId! }),
  }, { projection: { _id: 1 } });
  return tour ? { db, tourId: tour._id } : null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  if (!viewer.isAdmin && !viewer.agencyId) return NextResponse.json({ error: 'Katılımcıları görüntüleme yetkiniz yok.' }, { status: 403 });

  const { id } = await params;
  try {
    const authorized = await getAuthorizedTour(id, viewer);
    if (!authorized) return NextResponse.json({ error: 'Tur bulunamadı.' }, { status: ObjectId.isValid(id) ? 404 : 400 });
    const pageValue = Number(request.nextUrl.searchParams.get('page') || 1);
    const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    await ensureParticipantIndexes(authorized.db);

    const links = authorized.db.collection<{ tourId: ObjectId; participantId: ObjectId | string; createdAt: Date }>('tourParticipants');
    const filter = { tourId: authorized.tourId };
    const total = await links.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / PARTICIPANTS_PAGE_SIZE));
    const actualPage = Math.min(page, totalPages);
    const pageLinks = await links.find(filter).sort({ createdAt: 1, _id: 1 })
      .skip((actualPage - 1) * PARTICIPANTS_PAGE_SIZE).limit(PARTICIPANTS_PAGE_SIZE).toArray();
    const ids = pageLinks.map((link) => link.participantId);
    const records = ids.length
      ? await authorized.db.collection<ParticipantRecord>('participants').find({ _id: { $in: ids } }, { projection: { fullName: 1, name: 1, phone: 1, phoneNormalized: 1 } }).toArray()
      : [];
    const byId = new Map(records.map((participant) => [String(participant._id), participant]));
    const participants = pageLinks.flatMap((link) => {
      const participant = byId.get(String(link.participantId));
      return participant ? [{ ...toParticipantDto(participant), linkedAt: link.createdAt }] : [];
    });

    return NextResponse.json({
      participants,
      page: actualPage,
      pageSize: PARTICIPANTS_PAGE_SIZE,
      total,
      totalPages,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Tur katılımcıları listelenemedi:', error);
    return NextResponse.json({ error: 'Katılımcılar listelenemedi.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  if (!viewer.isAdmin && !viewer.agencyId) return NextResponse.json({ error: 'Katılımcı ekleme yetkiniz yok.' }, { status: 403 });

  const { id } = await params;
  const authorized = await getAuthorizedTour(id, viewer);
  if (!authorized) return NextResponse.json({ error: 'Tur bulunamadı.' }, { status: ObjectId.isValid(id) ? 404 : 400 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });

  const input = body as Record<string, unknown>;
  const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
  const phoneNormalized = normalizePhone(phone);
  if (Object.keys(input).some((key) => !['fullName', 'phone'].includes(key)) || fullName.length < 2 || fullName.length > 160 || !phoneNormalized) {
    return NextResponse.json({ error: 'Ad soyad ve telefon numarasını kontrol edin.' }, { status: 400 });
  }

  try {
    await ensureParticipantIndexes(authorized.db);
    const { participant, created } = await getOrCreateParticipant(authorized.db, fullName, phone, phoneNormalized);
    if (participant._id === undefined) throw new Error('Katılımcı kimliği oluşturulamadı.');
    let alreadyLinked = false;
    try {
      const relation = await authorized.db.collection<{ tourId: ObjectId; participantId: ObjectId | string; createdAt: Date }>('tourParticipants').updateOne(
        { tourId: authorized.tourId, participantId: participant._id },
        { $setOnInsert: { tourId: authorized.tourId, participantId: participant._id, createdAt: new Date() } },
        { upsert: true },
      );
      alreadyLinked = relation.upsertedCount === 0;
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      const existingLink = await authorized.db.collection('tourParticipants').findOne(
        { tourId: authorized.tourId, participantId: participant._id },
        { projection: { _id: 1 } },
      );
      if (!existingLink) throw error;
      alreadyLinked = true;
    }
    return NextResponse.json({
      ok: true,
      created,
      alreadyLinked,
      participant: toParticipantDto(participant),
    }, { status: alreadyLinked ? 200 : 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'DUPLICATE_PARTICIPANT_PHONE') {
      return NextResponse.json({ error: 'Bu telefon numarası birden fazla katılımcı kaydında var. Önce kayıtları birleştirin.' }, { status: 409 });
    }
    console.error('Tura katılımcı eklenemedi:', error);
    return NextResponse.json({ error: 'Katılımcı tura eklenemedi.' }, { status: 500 });
  }
}
