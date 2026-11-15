import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { DEMO_CODE, ensureMobileAuthIndexes, findMobileAccount, mobileHash, mobileRole, normalizeMobilePhone, requestFingerprint, withinRateLimit } from '@/lib/mobile-auth';
import { sendMobileCode } from '@/lib/mobile-sms';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 }); }
  const input = body as Record<string, unknown>;
  const phone = normalizeMobilePhone(input?.phone);
  const role = mobileRole(input?.role);
  if (!phone || !role) return NextResponse.json({ error: 'Telefon numarasını ve rolü kontrol edin.' }, { status: 400 });

  try {
    const db = await getDatabase();
    await ensureMobileAuthIndexes(db);
    const phoneKey = mobileHash(`phone:${role}:${phone}`);
    const ipKey = requestFingerprint(request);
    const [phoneAllowed, ipAllowed] = await Promise.all([
      withinRateLimit(db, `request:${phoneKey}`, 5, 900),
      withinRateLimit(db, `request-ip:${ipKey}`, 30, 900),
    ]);
    if (!phoneAllowed || !ipAllowed) return NextResponse.json({ error: 'Çok fazla deneme. Daha sonra tekrar deneyin.' }, { status: 429 });

    const accountId = await findMobileAccount(db, phone, role);
    const challengeId = mobileHash(`challenge:${role}:${phone}`);
    const nonce = randomUUID();
    await db.collection<{ _id: string }>('mobile_auth_challenges').updateOne(
      { _id: challengeId },
      { $set: {
        role, phoneHash: phoneKey, accountId: accountId?.toString() || null,
        codeHash: mobileHash(`code:${nonce}:${DEMO_CODE}`), nonce,
        attempts: 0, expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      } },
      { upsert: true },
    );
    if (!await sendMobileCode(phone)) return NextResponse.json({ error: 'Doğrulama servisi kullanılamıyor.' }, { status: 503 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'İstek işlenemedi. Lütfen tekrar deneyin.' }, { status: 503 });
  }
}
