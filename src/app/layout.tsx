import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lumina — 写真は撮るだけ。あとはAIがブランドを創る。",
  description:
    "Instagram & Googleビジネスプロフィールを、写真1枚から全自動運用。実店舗のためのAI SNSオートパイロット。",
  applicationName: "Lumina",
};

export const viewport: Viewport = {
  themeColor: "#0b0a14",
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
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="aurora-bg" aria-hidden />
        {children}
      </body>
    </html>
  );
}
