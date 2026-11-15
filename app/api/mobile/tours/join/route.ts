import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import { getMobileRequestContext } from '@/lib/mobile-auth';
import { ensureParticipantIndexes } from '@/lib/participants';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const context = await getMobileRequestContext(request, 'participant');
  if (!context) return NextResponse.json({ error: 'Oturum süresi doldu veya katılımcı yetkisi bulunamadı.' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 }); }
  const qrCode = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>).qrCode : null;
  if (typeof qrCode !== 'string' || qrCode.length > 200) return NextResponse.json({ error: 'Tur QR kodu okunamadı.' }, { status: 400 });
  const match = /^FOGO1\|([a-f\d]{24})\|([A-Za-z0-9_-]{40,60})$/.exec(qrCode);
  if (!match) return NextResponse.json({ error: 'Bu QR kod bir Fogo turuna ait değil.' }, { status: 400 });
  const [, tourId, token] = match;

  try {
    const tourObjectId = new ObjectId(tourId);
    const tour = await context.db.collection('tours').findOne({ _id: tourObjectId, joinQrToken: token }, { projection: { _id: 1, name: 1 } });
    if (!tour) return NextResponse.json({ error: 'Tur QR kodu geçersiz.' }, { status: 404 });

    await ensureParticipantIndexes(context.db);
    const participantId = ObjectId.isValid(context.accountId) ? new ObjectId(context.accountId) : context.accountId;
    let alreadyJoined = false;
    try {
      const result = await context.db.collection('tourParticipants').updateOne(
        { tourId: tour._id, participantId },
        { $setOnInsert: { tourId: tour._id, participantId, createdAt: new Date(), joinedVia: 'qr' } },
        { upsert: true },
      );
      alreadyJoined = result.upsertedCount === 0;
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      const existing = await context.db.collection('tourParticipants').findOne({ tourId: tour._id, participantId }, { projection: { _id: 1 } });
      if (!existing) throw error;
      alreadyJoined = true;
    }
    return NextResponse.json({ ok: true, alreadyJoined, tour: { id: String(tour._id), name: tour.name } }, { status: alreadyJoined ? 200 : 201 });
  } catch (error) {
    console.error('Katılımcı QR tur katılımı başarısız:', error);
    return NextResponse.json({ error: 'Tura katılım tamamlanamadı.' }, { status: 500 });
  }
}
