import { NextResponse } from 'next/server';
import { revokeMobileSession } from '@/lib/mobile-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (match) {
    try { await revokeMobileSession(match[1]); }
    catch (error) { console.error('Mobil çıkış hatası:', error); }
  }
  return NextResponse.json({ ok: true });
}
