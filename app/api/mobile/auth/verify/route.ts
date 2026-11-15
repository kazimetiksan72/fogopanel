import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { accountStillMatches, createMobileSession, ensureMobileAuthIndexes, mobileHash, mobileRole, normalizeMobilePhone, requestFingerprint, safeEqual, withinRateLimit, type MobileRole } from '@/lib/mobile-auth';

export const runtime = 'nodejs';

type Challenge = { _id: string; role: MobileRole; phoneHash: string; accountId: string | null; codeHash: string; nonce: string; attempts: number; expiresAt: Date };
const invalid = () => NextResponse.json({ error: 'Telefon, rol veya doğrulama kodu geçersiz.' }, { status: 401 });

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 }); }
  const input = body as Record<string, unknown>;
  const phone = normalizeMobilePhone(input?.phone);
  const role = mobileRole(input?.role);
  const code = input?.code;
  if (!phone || !role || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Telefon, rol veya kod biçimini kontrol edin.' }, { status: 400 });
  }

  try {
    const db = await getDatabase();
    await ensureMobileAuthIndexes(db);
    const phoneKey = mobileHash(`phone:${role}:${phone}`);
    const ipKey = requestFingerprint(request);
    const [phoneAllowed, ipAllowed] = await Promise.all([
      withinRateLimit(db, `verify:${phoneKey}`, 15, 900),
      withinRateLimit(db, `verify-ip:${ipKey}`, 60, 900),
    ]);
    if (!phoneAllowed || !ipAllowed) return NextResponse.json({ error: 'Çok fazla deneme. Daha sonra tekrar deneyin.' }, { status: 429 });

    const challenges = db.collection<Challenge>('mobile_auth_challenges');
    const challenge = await challenges.findOneAndUpdate(
      { _id: mobileHash(`challenge:${role}:${phone}`), expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } },
      { $inc: { attempts: 1 } },
      { returnDocument: 'after' },
    );
    if (!challenge || !safeEqual(mobileHash(`code:${challenge.nonce}:${code}`), challenge.codeHash) || !challenge.accountId ||
        !await accountStillMatches(db, challenge.accountId, phone, role)) return invalid();
    const consumed = await challenges.deleteOne({ _id: challenge._id, attempts: challenge.attempts });
    if (!consumed.deletedCount) return invalid();
    const session = await createMobileSession(db, role, challenge.accountId, phone);
    return NextResponse.json(session, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Giriş yapılamadı. Lütfen tekrar deneyin.' }, { status: 503 });
  }
}
