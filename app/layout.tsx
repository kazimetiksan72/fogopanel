import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FOGO | Yönetim Paneli',
  description: 'FOGO yönetim paneli giriş ekranı',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
