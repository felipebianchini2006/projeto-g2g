import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';

import { Providers } from '../components/providers';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'Meoww Games - Loja oficial',
  description: 'A casa gamer dos gatinhos: consoles, jogos e colecionaveis.',
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
      <body className={nunito.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
