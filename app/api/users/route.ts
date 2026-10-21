import { hash } from 'bcryptjs';
import { MongoServerError, ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getViewer, SYSTEM_ADMIN_EMAIL } from '@/lib/viewer';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  if (!viewer.isAdmin && !viewer.agencyId) return NextResponse.json({ error: 'Kullanıcı ekleme yetkiniz yok.' }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 }); }

  const input = body as Record<string, unknown>;
  const firstName = typeof input?.firstName === 'string' ? input.firstName.trim() : '';
  const lastName = typeof input?.lastName === 'string' ? input.lastName.trim() : '';
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input?.password === 'string' ? input.password : '';
  const requestedAgencyId = typeof input?.agencyId === 'string' ? input.agencyId : '';
  if (email === SYSTEM_ADMIN_EMAIL) return NextResponse.json({ error: 'Bu e-posta adresi kullanılamaz.' }, { status: 409 });

  if (!firstName || firstName.length > 80 || !lastName || lastName.length > 80 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      password.length < 8 || password.length > 1024) {
    return NextResponse.json({ error: 'Bilgileri kontrol edin. Şifre en az 8 karakter olmalı.' }, { status: 400 });
  }

  try {
    const db = await getDatabase();
    if (viewer.agencyId && requestedAgencyId !== viewer.agencyId.toString()) {
      return NextResponse.json({ error: 'Yalnızca kendi acentenize kullanıcı ekleyebilirsiniz.' }, { status: 403 });
    }
    const agencyId = viewer.agencyId || (requestedAgencyId ? (ObjectId.isValid(requestedAgencyId) ? new ObjectId(requestedAgencyId) : null) : null);
    if (requestedAgencyId && !agencyId) return NextResponse.json({ error: 'Geçersiz acente.' }, { status: 400 });
    if (agencyId && !await db.collection('agencies').findOne({ _id: agencyId }, { projection: { _id: 1 } })) {
      return NextResponse.json({ error: 'Acente bulunamadı.' }, { status: 400 });
    }
    const admins = db.collection('admins');
    await admins.createIndex({ email: 1 }, { unique: true });
    await admins.insertOne({ firstName, lastName, email, passwordHash: await hash(password, 12), agencyId, role: 'user', active: true, createdAt: new Date(), updatedAt: new Date() });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return NextResponse.json({ error: 'Bu e-posta adresi zaten kayıtlı.' }, { status: 409 });
    }
    console.error('Kullanıcı ekleme hatası:', error);
    return NextResponse.json({ error: 'Kullanıcı eklenemedi. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}
