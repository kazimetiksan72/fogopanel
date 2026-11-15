import { NextResponse } from 'next/server';
import { getMobileRequestContext } from '@/lib/mobile-auth';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getMobileRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Oturum süresi doldu veya geçersiz.' }, { status: 401 });
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{5,255}$/.test(id)) return NextResponse.json({ error: 'Geçersiz yer.' }, { status: 400 });
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Google Places API anahtarı henüz tanımlanmadı.' }, { status: 503 });
  try {
    const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`);
    url.searchParams.set('languageCode', 'tr');
    url.searchParams.set('regionCode', 'TR');
    const response = await fetch(url, {
      headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'id,displayName,formattedAddress' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return NextResponse.json({ error: 'Yer bilgisi alınamadı.' }, { status: 502 });
    const place = await response.json() as { id?: string; displayName?: { text?: string }; formattedAddress?: string };
    if (!place.id || !place.displayName?.text) return NextResponse.json({ error: 'Yer bilgisi bulunamadı.' }, { status: 404 });
    return NextResponse.json({ id: place.id, name: place.displayName.text, address: place.formattedAddress || '' }, { headers: { 'Cache-Control': 'private, max-age=3600' } });
  } catch (error) {
    console.error('Mobil tur mekânı yüklenemedi:', error);
    return NextResponse.json({ error: 'Yer bilgisi alınamadı.' }, { status: 502 });
  }
}
