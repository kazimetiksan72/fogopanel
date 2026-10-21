import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getViewer } from '@/lib/viewer';

export const runtime = 'nodejs';

function parseDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  if (!viewer.isAdmin && !viewer.agencyId) return NextResponse.json({ error: 'Tur düzenleme yetkiniz yok.' }, { status: 403 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Geçersiz tur.' }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some((key) => !['name', 'agencyId', 'guideId', 'startDate', 'endDate', 'type', 'dayPlans'].includes(key))) {
    return NextResponse.json({ error: 'Geçersiz alan.' }, { status: 400 });
  }

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const agencyIdText = typeof input.agencyId === 'string' ? input.agencyId.trim() : '';
  const guideIdProvided = Object.hasOwn(input, 'guideId');
  if (guideIdProvided && typeof input.guideId !== 'string') return NextResponse.json({ error: 'Geçersiz rehber seçimi.' }, { status: 400 });
  const guideIdText = typeof input.guideId === 'string' ? input.guideId.trim() : '';
  const startDate = parseDate(input.startDate);
  const endDate = parseDate(input.endDate);
  const type = input.type;
  if (agencyIdText && !ObjectId.isValid(agencyIdText)) return NextResponse.json({ error: 'Geçersiz acente seçimi.' }, { status: 400 });
  if (guideIdText && !ObjectId.isValid(guideIdText)) return NextResponse.json({ error: 'Geçersiz rehber seçimi.' }, { status: 400 });
  if (name.length < 2 || name.length > 120 || !startDate || !endDate || endDate < startDate || (type !== 'corporate' && type !== 'individual')) {
    return NextResponse.json({ error: 'Tur adı, tarihler ve tur tipini kontrol edin.' }, { status: 400 });
  }

  let dayPlans: { date: string; visits: { placeId: string; startTime: string }[] }[] | undefined;
  if (input.dayPlans !== undefined) {
    if (!Array.isArray(input.dayPlans) || input.dayPlans.length > 1000) {
      return NextResponse.json({ error: 'Gün programını kontrol edin.' }, { status: 400 });
    }
    const seenDates = new Set<string>();
    let visitCount = 0;
    dayPlans = [];
    for (const rawPlan of input.dayPlans) {
      if (!rawPlan || typeof rawPlan !== 'object' || Array.isArray(rawPlan)) return NextResponse.json({ error: 'Gün programını kontrol edin.' }, { status: 400 });
      const plan = rawPlan as Record<string, unknown>;
      const date = typeof plan.date === 'string' ? plan.date : '';
      const parsedDay = parseDate(date);
      if (!parsedDay || parsedDay < startDate || parsedDay > endDate || seenDates.has(date) || !Array.isArray(plan.visits) || plan.visits.length > 50) {
        return NextResponse.json({ error: 'Gün programındaki tarihleri ve yerleri kontrol edin.' }, { status: 400 });
      }
      seenDates.add(date);
      const visits: { placeId: string; startTime: string }[] = [];
      for (const rawVisit of plan.visits) {
        if (!rawVisit || typeof rawVisit !== 'object' || Array.isArray(rawVisit)) return NextResponse.json({ error: 'Gezilecek yerleri kontrol edin.' }, { status: 400 });
        const visit = rawVisit as Record<string, unknown>;
        const placeId = typeof visit.placeId === 'string' ? visit.placeId : '';
        const startTime = typeof visit.startTime === 'string' ? visit.startTime : '';
        if (!/^[A-Za-z0-9_-]{5,255}$/.test(placeId) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
          return NextResponse.json({ error: 'Her yer için Google Maps seçimi ve geçerli başlangıç saati gerekiyor.' }, { status: 400 });
        }
        visits.push({ placeId, startTime });
        visitCount++;
        if (visitCount > 1000) return NextResponse.json({ error: 'Çok fazla gezilecek yer eklendi.' }, { status: 400 });
      }
      if (visits.length) dayPlans.push({ date, visits });
    }
    dayPlans.sort((a, b) => a.date.localeCompare(b.date));
  }

  const requestedAgencyId = agencyIdText ? new ObjectId(agencyIdText) : null;
  if (viewer.agencyId && requestedAgencyId && !viewer.agencyId.equals(requestedAgencyId)) {
    return NextResponse.json({ error: 'Yalnızca kendi acentenizin turunu düzenleyebilirsiniz.' }, { status: 403 });
  }
  const agencyId = viewer.agencyId || requestedAgencyId;
  const guideId = guideIdText ? new ObjectId(guideIdText) : null;

  try {
    const db = await getDatabase();
    if (agencyId && !await db.collection('agencies').findOne({ _id: agencyId }, { projection: { _id: 1 } })) {
      return NextResponse.json({ error: 'Acente bulunamadı.' }, { status: 400 });
    }
    if (guideId && !await db.collection('guides').findOne({ _id: guideId, ...(viewer.isAdmin ? {} : { agencyId: viewer.agencyId! }) }, { projection: { _id: 1 } })) {
      return NextResponse.json({ error: 'Rehber bulunamadı veya seçme yetkiniz yok.' }, { status: 400 });
    }
    const result = await db.collection('tours').updateOne(
      { _id: new ObjectId(id), ...(viewer.isAdmin ? {} : { createdByAgencyId: viewer.agencyId! }) },
      { $set: { name, agencyId, ...(guideIdProvided ? { guideId } : {}), startDate, endDate, type, ...(dayPlans ? { dayPlans } : {}), updatedAt: new Date() } },
    );
    if (!result.matchedCount) return NextResponse.json({ error: 'Tur bulunamadı.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Tur düzenleme hatası:', error);
    return NextResponse.json({ error: 'Tur güncellenemedi. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}
