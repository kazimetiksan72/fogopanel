import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import { getGuidePhotoContainer } from '@/lib/azure-storage';
import { getDatabase } from '@/lib/mongodb';
import { getViewer } from '@/lib/viewer';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: RouteContext<'/api/guides/[id]/photo'>) {
  const viewer = await getViewer();
  if (!viewer) return new Response(null, { status: 401 });
  if (!viewer.isAdmin && !viewer.agencyId) return new Response(null, { status: 403 });

  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return new Response(null, { status: 404 });

  const db = await getDatabase();
  const guide = await db.collection<{ photoBlobName: string }>('guides').findOne(
    { _id: new ObjectId(id), ...(viewer.isAdmin ? {} : { agencyId: viewer.agencyId! }) },
    { projection: { photoBlobName: 1 } },
  );
  if (!guide?.photoBlobName) return new Response(null, { status: 404 });

  try {
    const bytes = await getGuidePhotoContainer().getBlockBlobClient(guide.photoBlobName).downloadToBuffer();
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(bytes.length),
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Rehber fotoğrafı okunamadı:', error);
    return new Response(null, { status: 404 });
  }
}
