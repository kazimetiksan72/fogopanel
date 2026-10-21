import { NextRequest, NextResponse } from 'next/server';
import { getViewer } from '@/lib/viewer';

export const runtime = 'nodejs';

type GoogleSuggestion = {
  placePrediction?: {
    placeId?: string;
    text?: { text?: string };
    structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
  };
};

export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  if (!viewer.isAdmin && !viewer.agencyId) return NextResponse.json({ error: 'Yer arama yetkiniz yok.' }, { status: 403 });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Google Places API anahtarı henüz tanımlanmadı.' }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  const input = body as Record<string, unknown>;
  const query = typeof input.query === 'string' ? input.query.trim() : '';
  const sessionToken = typeof input.sessionToken === 'string' ? input.sessionToken : '';
  if (query.length < 2 || query.length > 120 || !/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(sessionToken)) {
    return NextResponse.json({ error: 'Arama bilgilerini kontrol edin.' }, { status: 400 });
  }

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text',
      },
      body: JSON.stringify({ input: query, languageCode: 'tr', regionCode: 'TR', sessionToken }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error('Google Places arama hatası:', response.status);
      return NextResponse.json({ error: 'Google Places araması yapılamadı.' }, { status: 502 });
    }
    const data = await response.json() as { suggestions?: GoogleSuggestion[] };
    const places = (data.suggestions || []).flatMap((suggestion) => {
      const prediction = suggestion.placePrediction;
      if (!prediction?.placeId || !prediction.text?.text) return [];
      return [{
        id: prediction.placeId,
        name: prediction.structuredFormat?.mainText?.text || prediction.text.text,
        address: prediction.structuredFormat?.secondaryText?.text || '',
      }];
    }).slice(0, 5);
    return NextResponse.json({ places }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Google Places bağlantı hatası:', error);
    return NextResponse.json({ error: 'Google Places bağlantısı kurulamadı.' }, { status: 502 });
  }
}
