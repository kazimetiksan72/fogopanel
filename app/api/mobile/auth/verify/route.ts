import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Development placeholder. Replace with one-time SMS challenge and account lookup.
export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 }); }

  const input = body as Record<string, unknown>;
  const phone = typeof input?.phone === 'string' ? input.phone.trim() : '';
  const role = input?.role;
  const code = typeof input?.code === 'string' ? input.code : '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15 || (role !== 'participant' && role !== 'guide')) {
    return NextResponse.json({ error: 'Telefon numarasını kontrol edin.' }, { status: 400 });
  }
  if (code !== '1234') return NextResponse.json({ error: 'Kod hatalı. Tekrar deneyin.' }, { status: 401 });

  return NextResponse.json({ ok: true, phone, role, demo: true });
}
