import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { ObjectId, type Db } from 'mongodb';
import { getDatabase } from './mongodb';

export type MobileRole = 'participant' | 'guide';
export const MOBILE_SESSION_SECONDS = 7 * 24 * 60 * 60;
export const DEMO_CODE = '123456';

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET en az 32 karakter olmalı.');
  return value;
}

export function mobileHash(value: string) {
  return createHmac('sha256', secret()).update(`fogo-mobile-v1:${value}`).digest('hex');
}

export function safeEqual(left: string, right: string) {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function normalizeMobilePhone(input: unknown) {
  if (typeof input !== 'string' || input.length > 32 || !/^\+?[\d() .-]+$/.test(input)) return null;
  let digits = input.replace(/\D/g, '');
  if (input.trim().startsWith('00')) digits = digits.slice(2);
  if (digits.length === 10) digits = `90${digits}`;
  else if (digits.length === 11 && digits.startsWith('0')) digits = `90${digits.slice(1)}`;
  if (!/^[1-9]\d{9,14}$/.test(digits)) return null;
  return `+${digits}`;
}

export const normalizePhone = normalizeMobilePhone;

export function mobileRole(input: unknown): MobileRole | null {
  return input === 'participant' || input === 'guide' ? input : null;
}

export async function findMobileAccount(db: Db, phone: string, role: MobileRole) {
  if (role === 'participant') return null; // No participant account model exists yet.
  const guides = await db.collection<{ phone: string; active?: boolean }>('guides')
    .find({ active: { $ne: false } }, { projection: { phone: 1 } }).toArray();
  const matches = guides.filter((guide) => normalizeMobilePhone(guide.phone) === phone);
  return matches.length === 1 ? matches[0]._id : null;
}

export async function accountStillMatches(db: Db, accountId: string, phone: string, role: MobileRole) {
  if (role !== 'guide' || !ObjectId.isValid(accountId)) return false;
  const guide = await db.collection<{ phone: string; active?: boolean }>('guides')
    .findOne({ _id: new ObjectId(accountId), active: { $ne: false } }, { projection: { phone: 1 } });
  return normalizeMobilePhone(guide?.phone) === phone;
}

export async function ensureMobileAuthIndexes(db: Db) {
  await Promise.all([
    db.collection('mobile_auth_challenges').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('mobile_auth_limits').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('mobile_auth_sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
}

export async function withinRateLimit(db: Db, key: string, maximum: number, seconds: number) {
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const id = mobileHash(`limit:${key}:${bucket}`);
  const limits = db.collection<{ _id: string; count: number }>('mobile_auth_limits');
  const updated = await limits.findOneAndUpdate(
    { _id: id },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 2) * seconds * 1000) } },
    { upsert: true, returnDocument: 'after' },
  );
  return (updated?.count || 0) <= maximum;
}

export function requestFingerprint(request: Request) {
  const address = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  return mobileHash(`ip:${address}`);
}

export type MobileSession = { role: MobileRole; accountId: string; phone: string; expiresAt: Date; jtiHash: string };

function signingKey() {
  return new TextEncoder().encode(mobileHash('jwt-signing-key'));
}

export async function signMobileToken(sessionId: string, session: MobileSession, jti: string) {
  return new SignJWT({ purpose: 'mobile', role: session.role, sid: sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('fogo-mobile')
    .setAudience('fogo-mobile')
    .setSubject(session.accountId)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(Math.floor(session.expiresAt.getTime() / 1000))
    .sign(signingKey());
}

export async function createMobileSession(db: Db, role: MobileRole, accountId: string, phone: string) {
  const sessionId = randomUUID();
  const jti = randomUUID();
  const expiresAt = new Date(Math.floor(Date.now() / 1000) * 1000 + MOBILE_SESSION_SECONDS * 1000);
  const session: MobileSession = { role, accountId, phone, expiresAt, jtiHash: mobileHash(`jti:${jti}`) };
  const token = await signMobileToken(sessionId, session, jti);
  await db.collection<MobileSession & { _id: string }>('mobile_auth_sessions').insertOne({ _id: sessionId, ...session });
  return { token, expiresAt: expiresAt.toISOString(), user: { id: accountId, role, phone } };
}

export async function readMobileToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, signingKey(), { issuer: 'fogo-mobile', audience: 'fogo-mobile', algorithms: ['HS256'] });
    if (payload.purpose !== 'mobile' || !mobileRole(payload.role) || typeof payload.sid !== 'string' ||
        typeof payload.sub !== 'string' || typeof payload.jti !== 'string') return null;
    return { sessionId: payload.sid, accountId: payload.sub, role: payload.role as MobileRole, jtiHash: mobileHash(`jti:${payload.jti}`) };
  } catch { return null; }
}

export async function revokeMobileSession(token: string) {
  const claims = await readMobileToken(token);
  if (!claims) return;
  const db = await getDatabase();
  await db.collection('mobile_auth_sessions').deleteOne({ _id: claims.sessionId, jtiHash: claims.jtiHash });
}
