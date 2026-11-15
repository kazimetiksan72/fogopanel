import { randomBytes } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import { getMobileRequestContext } from '@/lib/mobile-auth';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getMobileRequestContext(request, 'guide');
  if (!context) return NextResponse.json({ error: 'Oturum süresi doldu veya rehber yetkisi bulunamadı.' }, { status: 401 });
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Tur bulunamadı.' }, { status: 404 });

  try {
    const guideId = ObjectId.isValid(context.accountId) ? new ObjectId(context.accountId) : context.accountId;
    const tours = context.db.collection('tours');
    const filter = { _id: new ObjectId(id), guideId: { $in: [guideId, context.accountId] } };
    let tour = await tours.findOne(filter, { projection: { name: 1, joinQrToken: 1 } });
    if (!tour) return NextResponse.json({ error: 'Tur bulunamadı veya size atanmamış.' }, { status: 404 });

    let token = typeof tour.joinQrToken === 'string' && /^[A-Za-z0-9_-]{40,60}$/.test(tour.joinQrToken) ? tour.joinQrToken : null;
    if (!token) {
      const candidate = randomBytes(32).toString('base64url');
      const oldTokenFilter = tour.joinQrToken === undefined ? { joinQrToken: { $exists: false } } : { joinQrToken: tour.joinQrToken };
      await tours.updateOne({ ...filter, ...oldTokenFilter }, { $set: { joinQrToken: candidate } });
      tour = await tours.findOne(filter, { projection: { name: 1, joinQrToken: 1 } });
      token = typeof tour?.joinQrToken === 'string' && /^[A-Za-z0-9_-]{40,60}$/.test(tour.joinQrToken) ? tour.joinQrToken : candidate;
    }

    return NextResponse.json({
      qrCode: `FOGO1|${id}|${token}`,
      tour: { id, name: tour?.name || '' },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Tur QR kodu oluşturulamadı:', error);
    return NextResponse.json({ error: 'Tur QR kodu oluşturulamadı.' }, { status: 500 });
  }
}
