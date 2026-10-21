import { hash } from 'bcryptjs';
import { MongoServerError, ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getViewer, SYSTEM_ADMIN_EMAIL } from '@/lib/viewer';

export const runtime = 'nodejs';

type UserRecord = { email: string; role?: string };

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  if (!viewer.isAdmin) return NextResponse.json({ error: 'Kullanıcı düzenleme yetkiniz yok.' }, { status: 403 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Geçersiz kullanıcı.' }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  const input = body as Record<string, unknown>;
  const allowed = new Set(['firstName', 'lastName', 'email', 'password', 'agencyId', 'active']);
  if (Object.keys(input).some((key) => !allowed.has(key))) return NextResponse.json({ error: 'Geçersiz alan.' }, { status: 400 });

  const firstName = typeof input.firstName === 'string' ? input.firstName.trim() : '';
  const lastName = typeof input.lastName === 'string' ? input.lastName.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const agencyIdText = typeof input.agencyId === 'string' ? input.agencyId : '';
  const active = input.active;
  if (!firstName || firstName.length > 80 || !lastName || lastName.length > 80 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      (password && (password.length < 8 || password.length > 1024)) || typeof active !== 'boolean' ||
      (agencyIdText && !ObjectId.isValid(agencyIdText))) {
    return NextResponse.json({ error: 'Bilgileri kontrol edin. Yeni şifre en az 8 karakter olmalı.' }, { status: 400 });
  }

  try {
    const db = await getDatabase();
    const users = db.collection<UserRecord>('admins');
    const targetId = new ObjectId(id);
    const target = await users.findOne({ _id: targetId }, { projection: { email: 1, role: 1 } });
    if (!target) return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    const isSystemAdmin = target.email === SYSTEM_ADMIN_EMAIL && target.role === 'superadmin';
    if (isSystemAdmin && (email !== SYSTEM_ADMIN_EMAIL || agencyIdText || !active)) {
      return NextResponse.json({ error: 'Sistem yöneticisinin e-postası, acentesi ve aktifliği değiştirilemez.' }, { status: 400 });
    }
    if (!isSystemAdmin && email === SYSTEM_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Bu e-posta adresi kullanılamaz.' }, { status: 409 });
    }
    const agencyId = agencyIdText ? new ObjectId(agencyIdText) : null;
    if (agencyId && !await db.collection('agencies').findOne({ _id: agencyId }, { projection: { _id: 1 } })) {
      return NextResponse.json({ error: 'Acente bulunamadı.' }, { status: 400 });
    }
    const changes: Record<string, unknown> = { firstName, lastName, email, active, agencyId, updatedAt: new Date() };
    if (password) changes.passwordHash = await hash(password, 12);
    await users.updateOne({ _id: targetId }, { $set: changes });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return NextResponse.json({ error: 'Bu e-posta adresi zaten kayıtlı.' }, { status: 409 });
    }
    console.error('Kullanıcı düzenleme hatası:', error);
    return NextResponse.json({ error: 'Kullanıcı güncellenemedi. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}
