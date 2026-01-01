import type { Metadata, Viewport } from 'next';
import { Fraunces, Manrope } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-body' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-display' });

const appTitle = process.env.NEXT_PUBLIC_APP_NAME ?? 'Planner App';
const appDescription =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION ?? 'Telegram Mini App Planner';
const appLang = process.env.NEXT_PUBLIC_APP_LANG ?? 'ru';
const telegramScriptSrc =
  process.env.NEXT_PUBLIC_TELEGRAM_SCRIPT_URL ??
  'https://telegram.org/js/telegram-web-app.js';

export const metadata: Metadata = {
  title: appTitle,
  description: appDescription,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: '#f2f2f7',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={appLang}>
      <head>
        <Script src={telegramScriptSrc} strategy="beforeInteractive" />
      </head>
      <body className={`${manrope.variable} ${fraunces.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
