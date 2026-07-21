import "./globals.css";
import type { Metadata } from "next";
import ClientRoot from "./ClientRoot";

export const metadata: Metadata = {
  title: "Mman Plaza",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ffffff" />

        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />

      </head>

      <body className="h-full flex flex-col overflow-x-hidden">
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
