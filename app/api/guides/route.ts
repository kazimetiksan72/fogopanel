import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getGuidePhotoContainer } from '@/lib/azure-storage';
import { getDatabase } from '@/lib/mongodb';
import { getViewer } from '@/lib/viewer';

export const runtime = 'nodejs';

const maxPhotoBytes = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  if (!viewer.isAdmin && !viewer.agencyId) return NextResponse.json({ error: 'Rehber ekleme yetkiniz yok.' }, { status: 403 });

  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: 'Geçersiz form verisi.' }, { status: 400 }); }

  const firstName = String(form.get('firstName') || '').trim();
  const lastName = String(form.get('lastName') || '').trim();
  const phone = String(form.get('phone') || '').trim();
  const phoneDigits = phone.replace(/\D/g, '');
  const photo = form.get('photo');

  if (firstName.length < 2 || firstName.length > 80 || lastName.length < 2 || lastName.length > 80 ||
      !/^[+\d() .-]{7,20}$/.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
    return NextResponse.json({ error: 'Ad, soyad ve telefon bilgilerini kontrol edin.' }, { status: 400 });
  }
  if (!(photo instanceof File) || photo.type !== 'image/jpeg' || photo.size === 0 || photo.size > maxPhotoBytes) {
    return NextResponse.json({ error: 'Kırpılmış JPEG fotoğrafı ekleyin (en fazla 5 MB).' }, { status: 400 });
  }

  const bytes = Buffer.from(await photo.arrayBuffer());
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    return NextResponse.json({ error: 'Fotoğraf biçimi geçersiz.' }, { status: 400 });
  }

  const blobName = `guides/${randomUUID()}.jpg`;
  try {
    const container = getGuidePhotoContainer();
    await container.createIfNotExists();
    await container.getBlockBlobClient(blobName).uploadData(bytes, {
      blobHTTPHeaders: { blobContentType: 'image/jpeg' },
    });

    try {
      const db = await getDatabase();
      const guides = db.collection('guides');
      await guides.createIndex({ agencyId: 1, createdAt: -1 });
      const result = await guides.insertOne({
        firstName, lastName, phone, photoBlobName: blobName,
        agencyId: viewer.agencyId || null,
        createdAt: new Date(), updatedAt: new Date(),
      });
      return NextResponse.json({ ok: true, id: result.insertedId.toString() }, { status: 201 });
    } catch (error) {
      await container.deleteBlob(blobName).catch(() => {});
      throw error;
    }
  } catch (error) {
    console.error('Rehber ekleme hatası:', error);
    return NextResponse.json({ error: 'Rehber eklenemedi. Azure bağlantısını ve form bilgilerini kontrol edin.' }, { status: 500 });
  }
}
