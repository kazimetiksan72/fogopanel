import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { accountStillMatches, mobileHash, readMobileToken, signMobileToken, type MobileSession } from '@/lib/mobile-auth';

export const runtime = 'nodejs';

const invalid = () => NextResponse.json({ error: 'Oturum süresi doldu veya geçersiz.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const match = /^Bearer ([A-Za-z0-9._-]+)$/.exec(authorization);
  if (!match) return invalid();
  const claims = await readMobileToken(match[1]);
  if (!claims) return invalid();

  try {
    const db = await getDatabase();
    const sessions = db.collection<MobileSession & { _id: string }>('mobile_auth_sessions');
    const session = await sessions.findOne({ _id: claims.sessionId, accountId: claims.accountId, role: claims.role, jtiHash: claims.jtiHash, expiresAt: { $gt: new Date() } });
    if (!session || !await accountStillMatches(db, session.accountId, session.phone, session.role)) return invalid();

    const jti = randomUUID();
    const token = await signMobileToken(session._id, session, jti);
    const rotated = await sessions.updateOne(
      { _id: session._id, jtiHash: claims.jtiHash, expiresAt: { $gt: new Date() } },
      { $set: { jtiHash: mobileHash(`jti:${jti}`) } },
    );
    if (!rotated.matchedCount) return invalid();
    return NextResponse.json({ token, expiresAt: session.expiresAt.toISOString(), user: { id: session.accountId, role: session.role, phone: session.phone } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Oturum yenilenemedi.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
