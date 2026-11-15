import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ensureParticipantIndexes, findParticipantsByPhone, toParticipantDto, type ParticipantRecord } from '@/lib/participants';
import { normalizePhone } from '@/lib/mobile-auth';
import { getViewer } from '@/lib/viewer';

export const runtime = 'nodejs';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; participantId: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  if (!viewer.isAdmin && !viewer.agencyId) return NextResponse.json({ error: 'Katılımcı düzenleme yetkiniz yok.' }, { status: 403 });

  const { id, participantId } = await params;
  if (!ObjectId.isValid(id) || !participantId || participantId.length > 128) return NextResponse.json({ error: 'Geçersiz tur veya katılımcı.' }, { status: 400 });
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
    const db = await getDatabase();
    await ensureParticipantIndexes(db);
    const tour = await db.collection('tours').findOne({
      _id: new ObjectId(id),
      ...(viewer.isAdmin ? {} : { createdByAgencyId: viewer.agencyId! }),
    }, { projection: { _id: 1 } });
    if (!tour) return NextResponse.json({ error: 'Tur bulunamadı.' }, { status: 404 });

    const participantIds: (ObjectId | string)[] = ObjectId.isValid(participantId) ? [new ObjectId(participantId), participantId] : [participantId];
    const participantFilter = { _id: { $in: participantIds } };
    const linked = await db.collection('tourParticipants').findOne({ tourId: tour._id, participantId: { $in: participantIds } }, { projection: { _id: 1 } });
    if (!linked) return NextResponse.json({ error: 'Katılımcı bu turda bulunamadı.' }, { status: 404 });

    const matches = await findParticipantsByPhone(db, phoneNormalized);
    if (matches.some((match) => String(match._id) !== participantId)) {
      return NextResponse.json({ error: 'Bu telefon numarası başka bir katılımcı tarafından kullanılıyor.' }, { status: 409 });
    }

    const participants = db.collection<ParticipantRecord>('participants');
    try {
      const result = await participants.updateOne(
        participantFilter,
        { $set: { fullName, phone, phoneNormalized, updatedAt: new Date() } },
      );
      if (!result.matchedCount) return NextResponse.json({ error: 'Katılımcı bulunamadı.' }, { status: 404 });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        return NextResponse.json({ error: 'Bu telefon numarası başka bir katılımcı tarafından kullanılıyor.' }, { status: 409 });
      }
      throw error;
    }

    const updated = await participants.findOne(participantFilter);
    return NextResponse.json({ ok: true, participant: updated ? toParticipantDto(updated) : null });
  } catch (error) {
    console.error('Katılımcı düzenlenemedi:', error);
    return NextResponse.json({ error: 'Katılımcı düzenlenemedi.' }, { status: 500 });
  }
}
