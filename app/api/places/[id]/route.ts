import { NextRequest, NextResponse } from 'next/server';
import { getViewer } from '@/lib/viewer';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  if (!viewer.isAdmin && !viewer.agencyId) return NextResponse.json({ error: 'Yer bilgisi görme yetkiniz yok.' }, { status: 403 });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Google Places API anahtarı henüz tanımlanmadı.' }, { status: 503 });

  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{5,255}$/.test(id)) return NextResponse.json({ error: 'Geçersiz yer.' }, { status: 400 });
  const sessionToken = request.nextUrl.searchParams.get('sessionToken');
  if (sessionToken && !/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(sessionToken)) {
    return NextResponse.json({ error: 'Geçersiz arama oturumu.' }, { status: 400 });
  }

  try {
    const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`);
    url.searchParams.set('languageCode', 'tr');
    url.searchParams.set('regionCode', 'TR');
    if (sessionToken) url.searchParams.set('sessionToken', sessionToken);
    const response = await fetch(url, {
      headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'id,displayName,formattedAddress,attributions' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error('Google Place Details hatası:', response.status);
      return NextResponse.json({ error: 'Yer bilgisi alınamadı.' }, { status: 502 });
    }
    const data = await response.json() as { id?: string; displayName?: { text?: string }; formattedAddress?: string; attributions?: { provider?: string; providerUri?: string }[] };
    if (!data.id || !data.displayName?.text) return NextResponse.json({ error: 'Yer bilgisi bulunamadı.' }, { status: 404 });
    const attributions = (data.attributions || []).filter((item) => item.provider).slice(0, 10).map((item) => ({
      provider: item.provider,
      providerUri: item.providerUri?.startsWith('https://') ? item.providerUri : '',
    }));
    return NextResponse.json({ id: data.id, name: data.displayName.text, address: data.formattedAddress || '', attributions }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Google Place Details bağlantı hatası:', error);
    return NextResponse.json({ error: 'Yer bilgisi alınamadı.' }, { status: 502 });
  }
}
