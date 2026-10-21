import { compare } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { createSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';

export const runtime = 'nodejs';

type Admin = { email: string; passwordHash: string; active?: boolean };

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input?.password === 'string' ? input.password : '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length > 1024) {
    return NextResponse.json({ error: 'E-posta veya şifre hatalı.' }, { status: 401 });
  }

  try {
    const db = await getDatabase();
    const admin = await db.collection<Admin>('admins').findOne({ email });
    const valid = admin?.active !== false && admin?.passwordHash
      ? await compare(password, admin.passwordHash)
      : false;

    if (!admin || !valid) {
      return NextResponse.json({ error: 'E-posta veya şifre hatalı.' }, { status: 401 });
    }

    const token = await createSession({ id: admin._id.toString(), email: admin.email });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return response;
  } catch (error) {
    console.error('Oturum açma hatası:', error);
    return NextResponse.json({ error: 'Şu anda giriş yapılamıyor. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}
