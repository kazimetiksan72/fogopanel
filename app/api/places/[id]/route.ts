import { NextRequest, NextResponse } from 'next/server';
import { getViewer } from '@/lib/viewer';

export const runtime = 'nodejs';

function googleUrl(value?: string) {
  if (!value) return '';
  try {
    const url = new URL(value, 'https://maps.google.com');
    return url.protocol === 'https:' ? url.toString() : '';
  } catch { return ''; }
}

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
      headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'id,displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,attributions,photos' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error('Google Place Details hatası:', response.status);
      return NextResponse.json({ error: 'Yer bilgisi alınamadı.' }, { status: 502 });
    }
    const data = await response.json() as {
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      nationalPhoneNumber?: string;
      internationalPhoneNumber?: string;
      attributions?: { provider?: string; providerUri?: string }[];
      photos?: {
        name?: string;
        googleMapsUri?: string;
        authorAttributions?: { displayName?: string; uri?: string; photoUri?: string }[];
      }[];
    };
    if (!data.id || !data.displayName?.text) return NextResponse.json({ error: 'Yer bilgisi bulunamadı.' }, { status: 404 });
    const attributions = (data.attributions || []).filter((item) => item.provider).slice(0, 10).map((item) => ({
      provider: item.provider,
      providerUri: googleUrl(item.providerUri),
    }));
    const photos = (data.photos || [])
      .filter((photo) => photo.name?.startsWith(`places/${data.id}/photos/`) && googleUrl(photo.googleMapsUri))
      .slice(0, 5)
      .map((photo) => ({
        name: photo.name,
        googleMapsUri: googleUrl(photo.googleMapsUri),
        authors: (photo.authorAttributions || []).filter((author) => author.displayName).map((author) => ({
          name: author.displayName,
          uri: googleUrl(author.uri),
          photoUri: googleUrl(author.photoUri),
        })),
      }));
    return NextResponse.json({
      id: data.id,
      name: data.displayName.text,
      address: data.formattedAddress || '',
      phone: data.nationalPhoneNumber || data.internationalPhoneNumber || '',
      phoneUri: data.internationalPhoneNumber || data.nationalPhoneNumber || '',
      attributions,
      photos,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Google Place Details bağlantı hatası:', error);
    return NextResponse.json({ error: 'Yer bilgisi alınamadı.' }, { status: 502 });
  }
}
