// force rebuild
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css?v=3";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mmanwu Plaza",
  description: "The official Mmanwu social square",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col items-center bg-white">
        <div className="w-full max-w-[300px] px-4">
          {children}
        </div>
      </body>
    </html>
  );
}
