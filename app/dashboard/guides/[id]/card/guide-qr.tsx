'use client';

import { QRCodeSVG } from 'qrcode.react';

export default function GuideQr({ value, name }: { value: string; name: string }) {
  return <QRCodeSVG value={value} size={220} marginSize={4} level="M" title={`${name} kişi kartı QR kodu`} />;
}
