import { MongoServerError } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getViewer } from '@/lib/viewer';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  if (!viewer.isAdmin) return NextResponse.json({ error: 'Acente ekleme yetkiniz yok.' }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 }); }
  const input = body as Record<string, unknown>;
  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  const taxNumber = typeof input?.taxNumber === 'string' ? input.taxNumber.trim() : '';
  const address = typeof input?.address === 'string' ? input.address.trim() : '';
  if (name.length < 2 || name.length > 120 || !/^\d{10}$/.test(taxNumber) || address.length < 5 || address.length > 500) {
    return NextResponse.json({ error: 'Acente adı, 10 haneli VKN ve adres bilgilerini kontrol edin.' }, { status: 400 });
  }

  try {
    const db = await getDatabase();
    const agencies = db.collection('agencies');
    await agencies.createIndex({ taxNumber: 1 }, { unique: true });
    const result = await agencies.insertOne({ name, taxNumber, address, createdAt: new Date(), updatedAt: new Date() });
    return NextResponse.json({ ok: true, id: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return NextResponse.json({ error: 'Bu VKN ile kayıtlı bir acente var.' }, { status: 409 });
    }
    console.error('Acente ekleme hatası:', error);
    return NextResponse.json({ error: 'Acente eklenemedi. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}
