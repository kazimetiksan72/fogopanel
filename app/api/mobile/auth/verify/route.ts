import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { accountStillMatches, createMobileSession, ensureMobileAuthIndexes, findMobileAccount, mobileHash, mobileRole, normalizeMobilePhone, requestFingerprint, safeEqual, withinRateLimit, type MobileRole } from '@/lib/mobile-auth';
import { isDemoCodeEnabled } from '@/lib/mobile-sms';
import { ensureParticipantIndexes, getOrCreateParticipant } from '@/lib/participants';

export const runtime = 'nodejs';

type Challenge = { _id: string; role: MobileRole; phoneHash: string; accountId: string | null; codeHash: string; nonce: string; mode?: 'demo' | 'sms'; attempts: number; expiresAt: Date };
const invalid = () => NextResponse.json({ error: 'Telefon, rol veya doğrulama kodu geçersiz.' }, { status: 401 });

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 }); }
  const input = body as Record<string, unknown>;
  const phone = normalizeMobilePhone(input?.phone);
  const role = mobileRole(input?.role);
  const code = input?.code;
  const fullName = typeof input?.fullName === 'string' ? input.fullName.trim() : '';
  if (!phone || !role || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Telefon, rol veya kod biçimini kontrol edin.' }, { status: 400 });
  }
  if (Object.keys(input).some((key) => !['phone', 'role', 'code', 'fullName'].includes(key)) || fullName.length > 160) {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
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
    if (!challenge || (challenge.mode !== 'sms' && !isDemoCodeEnabled()) ||
        !safeEqual(mobileHash(`code:${challenge.nonce}:${code}`), challenge.codeHash)) return invalid();

    let accountId = challenge.accountId;
    if (role === 'guide') {
      if (!accountId || !await accountStillMatches(db, accountId, phone, role)) return invalid();
    } else if (accountId && !await accountStillMatches(db, accountId, phone, role)) {
      return invalid();
    }
    if (role === 'participant' && !accountId) {
      const existingParticipantId = await findMobileAccount(db, phone, 'participant');
      accountId = existingParticipantId?.toString() || null;
    }
    if (role === 'participant' && !accountId) {
      if (!fullName) return NextResponse.json({ profileRequired: true });
      if (fullName.length < 2) return NextResponse.json({ error: 'Ad soyad en az 2 karakter olmalı.' }, { status: 400 });
      await ensureParticipantIndexes(db);
      const { participant } = await getOrCreateParticipant(db, fullName, phone, phone);
      if (participant._id === undefined) throw new Error('Katılımcı hesabı oluşturulamadı.');
      accountId = String(participant._id);
    } else if (role === 'participant' && !await accountStillMatches(db, accountId!, phone, role)) {
      return invalid();
    }

    const consumed = await challenges.deleteOne({ _id: challenge._id, attempts: challenge.attempts });
    if (!consumed.deletedCount) return invalid();
    const session = await createMobileSession(db, role, accountId!, phone);
    return NextResponse.json(session, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'DUPLICATE_PARTICIPANT_PHONE') {
      return NextResponse.json({ error: 'Bu telefon numarası birden fazla katılımcı kaydında var. Yönetim panelinden kayıtları birleştirin.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Giriş yapılamadı. Lütfen tekrar deneyin.' }, { status: 503 });
  }
}
