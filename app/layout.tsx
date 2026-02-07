import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// ▼ 変更点1：ここを 'next/script' に変える
import Script from 'next/script'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ズボラ掃除パートナー | 褒められる掃除管理アプリ",
  description: "掃除が苦手な一人暮らしのための管理アプリ。Amazonで買える最強の掃除グッズも紹介。掃除完了でめちゃくちゃ褒められます。",
  verification: {
    google: '26hg5yiHFNewJIHBfPF6X8I71j5jUZmTwgtKkZyj3zE', 
  },
};

export const viewport: Viewport = {
  width: "device-width",
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
    <html lang="ja">
      <head>
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className={inter.className}>
        {children}

        {/* ▼ 変更点2：Googleアナリティクスを手動で埋め込む（これが一番確実！） */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-THRTNQENMF"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-THRTNQENMF');
          `}
        </Script>
      </body>
    </html>
  );
}