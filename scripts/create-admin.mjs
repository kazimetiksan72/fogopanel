import { MongoClient } from 'mongodb';
import { hash } from 'bcryptjs';

const uri = process.env.MONGODB_URI;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!uri || !email || !password) {
  console.error('MONGODB_URI, ADMIN_EMAIL ve ADMIN_PASSWORD gerekli.');
  process.exit(1);
}
if (email !== 'system@fogo.com.tr') {
  console.error('Yönetici hesabı system@fogo.com.tr olmalı.');
  process.exit(1);
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) {
  console.error('Geçerli bir e-posta ve en az 12 karakterlik şifre kullanın.');
  process.exit(1);
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'fogo_admin');
  const admins = db.collection('admins');
  await admins.createIndex({ email: 1 }, { unique: true });
  await admins.updateOne(
    { email },
    { $set: { passwordHash: await hash(password, 12), role: 'superadmin', agencyId: null, active: true, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
  console.log(`Yönetici hesabı hazır: ${email}`);
} finally {
  await client.close();
}
