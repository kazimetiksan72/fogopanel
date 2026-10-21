import { NextRequest, NextResponse } from 'next/server';
import { getViewer } from '@/lib/viewer';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  if (!viewer.isAdmin && !viewer.agencyId) return NextResponse.json({ error: 'Fotoğraf görme yetkiniz yok.' }, { status: 403 });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Google Places API anahtarı henüz tanımlanmadı.' }, { status: 503 });

  const photoName = request.nextUrl.searchParams.get('name') || '';
  if (!/^places\/[A-Za-z0-9_-]{5,255}\/photos\/[A-Za-z0-9_-]{8,1024}$/.test(photoName)) {
    return NextResponse.json({ error: 'Geçersiz fotoğraf.' }, { status: 400 });
  }

  try {
    const url = new URL(`https://places.googleapis.com/v1/${photoName}/media`);
    url.searchParams.set('maxWidthPx', '900');
    url.searchParams.set('skipHttpRedirect', 'true');
    const response = await fetch(url, {
      headers: { 'X-Goog-Api-Key': apiKey },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error('Google Places fotoğraf hatası:', response.status);
      return NextResponse.json({ error: 'Fotoğraf alınamadı.' }, { status: 502 });
    }
    const data = await response.json() as { photoUri?: string };
    if (!data.photoUri) return NextResponse.json({ error: 'Fotoğraf bulunamadı.' }, { status: 404 });
    const imageUrl = new URL(data.photoUri);
    if (imageUrl.protocol !== 'https:' || !(/(^|\.)googleusercontent\.com$/).test(imageUrl.hostname)) {
      return NextResponse.json({ error: 'Geçersiz fotoğraf adresi.' }, { status: 502 });
    }
    return NextResponse.redirect(imageUrl, { status: 302, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch (error) {
    console.error('Google Places fotoğraf bağlantı hatası:', error);
    return NextResponse.json({ error: 'Fotoğraf alınamadı.' }, { status: 502 });
  }
}
