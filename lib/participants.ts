import { ObjectId, type Db } from 'mongodb';
import { normalizePhone } from '@/lib/mobile-auth';

export const PARTICIPANTS_PAGE_SIZE = 20;

export type ParticipantRecord = {
  _id?: ObjectId | string;
  fullName?: string;
  name?: string;
  phone?: string;
  phoneNormalized?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export async function ensureParticipantIndexes(db: Db) {
  await Promise.all([
    db.collection<ParticipantRecord>('participants').createIndex(
      { phoneNormalized: 1 },
      { unique: true, partialFilterExpression: { phoneNormalized: { $type: 'string' } } },
    ),
    db.collection('tourParticipants').createIndex({ tourId: 1, participantId: 1 }, { unique: true }),
    db.collection('tourParticipants').createIndex({ participantId: 1, createdAt: -1 }),
    db.collection('tourParticipants').createIndex({ tourId: 1, createdAt: 1 }),
  ]);
}

function participantPhoneQuery(phone: string) {
  const digits = phone.replace(/\D/g, '');
  const variants = new Set([digits]);
  if (digits.startsWith('90') && digits.length === 12) {
    variants.add(digits.slice(2));
    variants.add(`0${digits.slice(2)}`);
  }
  return [
    { phoneNormalized: phone },
    ...[...variants].map((variant) => ({
      phone: { $regex: `(^|\\D)${variant.split('').join('\\D*')}(\\D|$)` },
    })),
  ];
}

export async function findParticipantsByPhone(db: Db, phone: string) {
  const candidates = await db.collection<ParticipantRecord>('participants').find({
    $or: participantPhoneQuery(phone),
  }, { projection: { fullName: 1, name: 1, phone: 1, phoneNormalized: 1, createdAt: 1 } }).limit(2).toArray();
  return candidates.filter((candidate) => normalizePhone(candidate.phoneNormalized || candidate.phone) === phone);
}

export function toParticipantDto(participant: ParticipantRecord) {
  return {
    id: String(participant._id),
    fullName: participant.fullName || participant.name || '',
    phone: participant.phone || participant.phoneNormalized || '',
  };
}

export async function getOrCreateParticipant(db: Db, fullName: string, phone: string, phoneNormalized: string) {
  const participants = db.collection<ParticipantRecord>('participants');
  const matches = await findParticipantsByPhone(db, phoneNormalized);
  if (matches.length > 1) throw new Error('DUPLICATE_PARTICIPANT_PHONE');
  if (matches.length === 1) {
    const existing = matches[0];
    if (existing.phoneNormalized !== phoneNormalized) {
      try {
        await participants.updateOne({ _id: existing._id }, { $set: { phoneNormalized, updatedAt: new Date() } });
      } catch (error) {
        if ((error as { code?: number }).code === 11000) throw new Error('DUPLICATE_PARTICIPANT_PHONE');
        throw error;
      }
    }
    return { participant: { ...existing, phoneNormalized }, created: false };
  }

  const now = new Date();
  try {
    const result = await participants.insertOne({ fullName, phone, phoneNormalized, createdAt: now, updatedAt: now });
    return { participant: { _id: result.insertedId, fullName, phone, phoneNormalized, createdAt: now, updatedAt: now }, created: true };
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      const concurrent = await participants.findOne({ phoneNormalized });
      if (concurrent) return { participant: concurrent, created: false };
    }
    throw error;
  }
}
