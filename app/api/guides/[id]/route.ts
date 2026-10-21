import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { getGuidePhotoContainer } from '@/lib/azure-storage';
import { getDatabase } from '@/lib/mongodb';
import { getViewer } from '@/lib/viewer';

export const runtime = 'nodejs';

const maxPhotoBytes = 5 * 1024 * 1024;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
  if (!viewer.isAdmin && !viewer.agencyId) return NextResponse.json({ error: 'Rehber düzenleme yetkiniz yok.' }, { status: 403 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Geçersiz rehber.' }, { status: 400 });

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

  let photoBytes: Buffer | null = null;
  if (photo !== null) {
    if (!(photo instanceof File) || photo.type !== 'image/jpeg' || photo.size === 0 || photo.size > maxPhotoBytes) {
      return NextResponse.json({ error: 'Kırpılmış JPEG fotoğrafı ekleyin (en fazla 5 MB).' }, { status: 400 });
    }
    photoBytes = Buffer.from(await photo.arrayBuffer());
    if (photoBytes[0] !== 0xff || photoBytes[1] !== 0xd8 || photoBytes[2] !== 0xff) {
      return NextResponse.json({ error: 'Fotoğraf biçimi geçersiz.' }, { status: 400 });
    }
  }

  const filter = { _id: new ObjectId(id), ...(viewer.isAdmin ? {} : { agencyId: viewer.agencyId! }) };
  let newBlobName: string | null = null;
  try {
    const db = await getDatabase();
    const guides = db.collection<{ photoBlobName: string }>('guides');
    const existing = await guides.findOne(filter, { projection: { photoBlobName: 1 } });
    if (!existing) return NextResponse.json({ error: 'Rehber bulunamadı.' }, { status: 404 });

    if (photoBytes) {
      newBlobName = `guides/${randomUUID()}.jpg`;
      const container = getGuidePhotoContainer();
      await container.getBlockBlobClient(newBlobName).uploadData(photoBytes, {
        blobHTTPHeaders: { blobContentType: 'image/jpeg' },
      });
    }

    const result = await guides.updateOne(
      { ...filter, photoBlobName: existing.photoBlobName },
      { $set: { firstName, lastName, phone, ...(newBlobName ? { photoBlobName: newBlobName } : {}), updatedAt: new Date() } },
    );
    if (!result.matchedCount) {
      if (newBlobName) await getGuidePhotoContainer().deleteBlob(newBlobName).catch(() => {});
      return NextResponse.json({ error: 'Rehber değişti. Sayfayı yenileyip tekrar deneyin.' }, { status: 409 });
    }

    if (newBlobName) {
      try { await getGuidePhotoContainer().deleteBlob(existing.photoBlobName); }
      catch (error) { console.error('Eski rehber fotoğrafı silinemedi:', error); }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (newBlobName) await getGuidePhotoContainer().deleteBlob(newBlobName).catch(() => {});
    console.error('Rehber düzenleme hatası:', error);
    return NextResponse.json({ error: 'Rehber güncellenemedi. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}
