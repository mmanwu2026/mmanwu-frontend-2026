// force rebuild
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

// @ts-ignore  // TypeScript cannot parse CSS query params, but Next.js can
import "./globals.css?v=21";

import { UserProvider } from "@/context/UserContext";
import AuthNav from "@/components/AuthNav";

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
      {/* plaza-css-bust-21 */}
      <body className="min-h-screen bg-black text-white">
        <UserProvider>
          <AuthNav />
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
