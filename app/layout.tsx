// force rebuild
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

// ⭐ Cache‑bust CSS so Vercel + browser load the NEW styles
import "./globals.css?v=10";

import { UserProvider } from "@/context/UserContext";  // ⭐ stays here
import Header from "@/components/Header";              // ⭐ NEW: client header

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
      {/* plaza-css-bust-10 */}
      <body className="min-h-screen flex flex-col items-center bg-white">
        <UserProvider>
          <div className="w-full max-w-xl px-4">

            {/* ⭐ CLIENT HEADER */}
            <Header />

            {children}
          </div>
        </UserProvider>
      </body>
    </html>
  );
}
