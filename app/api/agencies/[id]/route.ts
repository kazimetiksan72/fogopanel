import { MongoServerError, ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getViewer } from '@/lib/viewer';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  if (!viewer.isAdmin) return NextResponse.json({ error: 'Acente düzenleme yetkiniz yok.' }, { status: 403 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Geçersiz acente.' }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== 'name' && key !== 'taxNumber' && key !== 'address')) return NextResponse.json({ error: 'Geçersiz alan.' }, { status: 400 });
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const taxNumber = typeof input.taxNumber === 'string' ? input.taxNumber.trim() : '';
  const address = typeof input.address === 'string' ? input.address.trim() : '';
  if (name.length < 2 || name.length > 120 || !/^\d{10}$/.test(taxNumber) || address.length < 5 || address.length > 500) {
    return NextResponse.json({ error: 'Acente adı, 10 haneli VKN ve adres bilgilerini kontrol edin.' }, { status: 400 });
  }

  try {
    const db = await getDatabase();
    const result = await db.collection('agencies').updateOne({ _id: new ObjectId(id) }, { $set: { name, taxNumber, address, updatedAt: new Date() } });
    if (!result.matchedCount) return NextResponse.json({ error: 'Acente bulunamadı.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) return NextResponse.json({ error: 'Bu VKN ile kayıtlı bir acente var.' }, { status: 409 });
    console.error('Acente düzenleme hatası:', error);
    return NextResponse.json({ error: 'Acente güncellenemedi. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}
