import type { Area } from 'react-easy-crop';

export async function makeCroppedPhoto(file: File, area: Area): Promise<File> {
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Fotoğraf işlenemedi.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 600, 600);
    context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, 600, 600);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    if (!blob) throw new Error('Fotoğraf işlenemedi.');
    return new File([blob], 'rehber-fotografi.jpg', { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(source);
  }
}
