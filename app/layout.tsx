import type { Metadata } from 'next';
import { Open_Sans } from 'next/font/google';
import './globals.css';

const opensans = Open_Sans({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Lokal files',
  description: 'Serve your files in style',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full min-h-full bg-white">
      <body className={opensans.className + ' h-full min-h-full'}>
        {children}
      </body>
    </html>
  );
}
