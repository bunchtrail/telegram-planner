import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const appTitle = process.env.NEXT_PUBLIC_APP_NAME ?? "Planner App";
const appDescription =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION ?? "Telegram Mini App Planner";
const appLang = process.env.NEXT_PUBLIC_APP_LANG ?? "ru";
const telegramScriptSrc =
  process.env.NEXT_PUBLIC_TELEGRAM_SCRIPT_URL ??
  "https://telegram.org/js/telegram-web-app.js";

export const metadata: Metadata = {
  title: appTitle,
  description: appDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={appLang}>
      <head>
        <script src={telegramScriptSrc} async />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
