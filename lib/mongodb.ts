import { MongoClient } from 'mongodb';

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

export async function getDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI tanımlı değil.');

  const clientPromise = globalForMongo.mongoClientPromise ??
    new MongoClient(uri, { serverSelectionTimeoutMS: 5000 }).connect();
  globalForMongo.mongoClientPromise = clientPromise;
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB || 'fogo_admin');
}
