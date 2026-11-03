import type { Metadata } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import DevEditorLink from './components/DevEditorLink';
import FooterCreditsWithModal from './components/FooterCreditsWithModal';

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://hiyokoniki.jp'),
  title: 'ひよこニキのホームページ',
  description: 'ひよこニキのホームページ',
  icons: {
    icon: '/icon.webp',
  },
  openGraph: {
    title: 'ひよこニキのホームページ',
    description: 'ひよこニキのホームページ',
    url: 'https://hiyokoniki.jp/',
    siteName: 'ひよこニキのホームページ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: '/header.webp',
        alt: 'ひよこニキのホームページ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ひよこニキのホームページ',
    description: 'ひよこニキのホームページ',
    images: ['/header.webp'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={notoSansJP.className}>
        <div className="site-wrap">
          <header className="site-header">
            <div className="header-inner">
              <Link href="/" className="site-brand">
                <img src="/icon.webp" alt="ひよこニキのホームページ icon" className="site-icon" />
                <span>ひよこニキのホームページ</span>
              </Link>
              <nav className="header-nav">
                <Link href="/">Home</Link>
                <a href="https://www.twitter.com/otenkigirl_exe" target="_blank" rel="noopener noreferrer">
                  X / Twitter
                </a>
              </nav>
            </div>
          </header>

          {children}

          <footer className="site-footer">
            <div className="footer-inner">
              <FooterCreditsWithModal />
              <DevEditorLink />
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
