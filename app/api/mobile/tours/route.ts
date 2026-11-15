import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import { getMobileRequestContext } from '@/lib/mobile-auth';
import { ensureParticipantIndexes } from '@/lib/participants';

export const runtime = 'nodejs';

function dateValue(value: unknown) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : typeof value === 'string' ? value.slice(0, 10) : '';
}

export async function GET(request: Request) {
  const context = await getMobileRequestContext(request);
  if (!context) return NextResponse.json({ error: 'Oturum süresi doldu veya geçersiz.' }, { status: 401 });

  try {
    const tours = context.db.collection('tours');
    if (context.role === 'guide') {
      const guideId = ObjectId.isValid(context.accountId) ? new ObjectId(context.accountId) : context.accountId;
      const assigned = await tours.find({ guideId: { $in: [guideId, context.accountId] } }, {
        projection: { name: 1, startDate: 1, endDate: 1, dayPlans: 1 },
      }).sort({ startDate: 1 }).limit(200).toArray();
      return NextResponse.json({ tours: assigned.map((tour) => ({
        id: String(tour._id),
        name: tour.name,
        startDate: dateValue(tour.startDate),
        endDate: dateValue(tour.endDate),
        dayCount: Array.isArray(tour.dayPlans) ? tour.dayPlans.length : 0,
      })) }, { headers: { 'Cache-Control': 'no-store' } });
    }

    await ensureParticipantIndexes(context.db);
    const participantId = ObjectId.isValid(context.accountId) ? new ObjectId(context.accountId) : context.accountId;
    const links = await context.db.collection('tourParticipants').find({ participantId: { $in: [participantId, context.accountId] } })
      .sort({ createdAt: -1 }).limit(200).toArray();
    const ids = links.map((link) => link.tourId);
    const records = ids.length ? await tours.find({ _id: { $in: ids } }, {
      projection: { name: 1, startDate: 1, endDate: 1 },
    }).toArray() : [];
    const byId = new Map(records.map((tour) => [String(tour._id), tour]));
    return NextResponse.json({ tours: links.flatMap((link) => {
      const tour = byId.get(String(link.tourId));
      return tour ? [{
        id: String(tour._id),
        name: tour.name,
        startDate: dateValue(tour.startDate),
        endDate: dateValue(tour.endDate),
      }] : [];
    }) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Mobil turlar yüklenemedi:', error);
    return NextResponse.json({ error: 'Turlar yüklenemedi.' }, { status: 500 });
  }
}
