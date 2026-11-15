import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import { getMobileRequestContext } from '@/lib/mobile-auth';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getMobileRequestContext(request, 'guide');
  if (!context) return NextResponse.json({ error: 'Oturum süresi doldu veya rehber yetkisi bulunamadı.' }, { status: 401 });
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Tur bulunamadı.' }, { status: 404 });
  try {
    const guideId = ObjectId.isValid(context.accountId) ? new ObjectId(context.accountId) : context.accountId;
    const tour = await context.db.collection('tours').findOne({
      _id: new ObjectId(id),
      guideId: { $in: [guideId, context.accountId] },
    }, { projection: { name: 1, startDate: 1, endDate: 1, dayPlans: 1 } });
    if (!tour) return NextResponse.json({ error: 'Tur bulunamadı veya size atanmamış.' }, { status: 404 });
    const participants = await context.db.collection('tourParticipants').countDocuments({ tourId: tour._id });
    return NextResponse.json({ tour: {
      id: String(tour._id),
      name: tour.name,
      startDate: tour.startDate instanceof Date ? tour.startDate.toISOString().slice(0, 10) : String(tour.startDate || '').slice(0, 10),
      endDate: tour.endDate instanceof Date ? tour.endDate.toISOString().slice(0, 10) : String(tour.endDate || '').slice(0, 10),
      dayPlans: Array.isArray(tour.dayPlans) ? tour.dayPlans : [],
      participantCount: participants,
    } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Mobil tur ayrıntıları yüklenemedi:', error);
    return NextResponse.json({ error: 'Tur ayrıntıları yüklenemedi.' }, { status: 500 });
  }
}
