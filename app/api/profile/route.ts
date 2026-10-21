import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  if (!ObjectId.isValid(session.id)) return NextResponse.json({ error: 'Geçersiz oturum.' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 }); }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== 'firstName' && key !== 'lastName')) {
    return NextResponse.json({ error: 'Yalnızca ad ve soyad güncellenebilir.' }, { status: 400 });
  }
  const firstName = typeof input.firstName === 'string' ? input.firstName.trim() : '';
  const lastName = typeof input.lastName === 'string' ? input.lastName.trim() : '';
  if (!firstName || firstName.length > 80 || !lastName || lastName.length > 80) {
    return NextResponse.json({ error: 'Ad ve soyad 1–80 karakter olmalı.' }, { status: 400 });
  }

  try {
    const db = await getDatabase();
    const result = await db.collection('admins').updateOne(
      { _id: new ObjectId(session.id), active: { $ne: false } },
      { $set: { firstName, lastName, updatedAt: new Date() } },
    );
    if (!result.matchedCount) return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Profil güncelleme hatası:', error);
    return NextResponse.json({ error: 'Profil güncellenemedi. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}
