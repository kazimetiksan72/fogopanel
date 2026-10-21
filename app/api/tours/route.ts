import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getViewer } from '@/lib/viewer';

export const runtime = 'nodejs';

function parseDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  if (!viewer.isAdmin && !viewer.agencyId) return NextResponse.json({ error: 'Tur ekleme yetkiniz yok.' }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 }); }
  const input = body as Record<string, unknown>;
  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  const agencyIdText = typeof input?.agencyId === 'string' ? input.agencyId.trim() : '';
  const type = input?.type;
  const startDate = parseDate(input?.startDate);
  const endDate = parseDate(input?.endDate);
  if (agencyIdText !== '' && !ObjectId.isValid(agencyIdText)) {
    return NextResponse.json({ error: 'Geçersiz acente seçimi.' }, { status: 400 });
  }
  if (name.length < 2 || name.length > 120 ||
      !startDate || !endDate || endDate < startDate || (type !== 'corporate' && type !== 'individual')) {
    return NextResponse.json({ error: 'Tur adı, tarihler ve tur tipini kontrol edin.' }, { status: 400 });
  }
  const requestedAgencyId = agencyIdText ? new ObjectId(agencyIdText) : null;
  if (viewer.agencyId && requestedAgencyId && !viewer.agencyId.equals(requestedAgencyId)) {
    return NextResponse.json({ error: 'Yalnızca kendi acentenize tur ekleyebilirsiniz.' }, { status: 403 });
  }
  const agencyId = viewer.agencyId || requestedAgencyId;

  try {
    const db = await getDatabase();
    if (agencyId && !await db.collection('agencies').findOne({ _id: agencyId }, { projection: { _id: 1 } })) {
      return NextResponse.json({ error: 'Acente bulunamadı.' }, { status: 400 });
    }
    const tours = db.collection('tours');
    await tours.createIndex({ agencyId: 1, startDate: -1 });
    const result = await tours.insertOne({ name, agencyId, startDate, endDate, type, createdAt: new Date(), updatedAt: new Date() });
    return NextResponse.json({ ok: true, id: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    console.error('Tur ekleme hatası:', error);
    return NextResponse.json({ error: 'Tur eklenemedi. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}
