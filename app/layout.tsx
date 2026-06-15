// force rebuild
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

// Cache‑bust CSS so Vercel + browser load the NEW styles
import "./globals.css?v=10";

import { UserProvider } from "@/context/UserContext";

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
      <body className="min-h-screen">
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
