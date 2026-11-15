import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Development placeholder until an SMS provider and phone account model are connected.
export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 }); }

  const input = body as Record<string, unknown>;
  const phone = typeof input?.phone === 'string' ? input.phone.trim() : '';
  const role = input?.role;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15 || (role !== 'participant' && role !== 'guide')) {
    return NextResponse.json({ error: 'Telefon numarasını kontrol edin.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, delivery: 'development', message: 'SMS sağlayıcısı bağlanana kadar doğrulama kodu 1234.' });
}
