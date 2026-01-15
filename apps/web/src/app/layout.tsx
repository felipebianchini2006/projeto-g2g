import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';

import { Providers } from '../components/providers';
import './globals.css';

const poppinsBody = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-body',
});
const poppinsDisplay = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Meoww Games - Loja oficial',
  description: 'A casa gamer dos gatinhos: consoles, jogos e colecionaveis.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body
        className={`${poppinsBody.variable} ${poppinsDisplay.variable} min-h-screen bg-white text-meow-charcoal`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
