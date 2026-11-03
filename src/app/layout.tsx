import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bầu Cua Tết Online — Trò Chơi Dân Gian Đón Xuân',
  description: 'Trò chơi Bầu Cua Tôm Cá trực tuyến nhiều người chơi, đồ họa Tết Giáp Thìn đậm đà bản sắc Việt.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className="antialiased selection:bg-amber-500 selection:text-red-950">
        {children}
      </body>
    </html>
  );
}
