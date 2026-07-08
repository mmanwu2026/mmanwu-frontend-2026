import "./globals.css";
import type { Metadata } from "next";
import ProvidersWrapper from "./providers-wrapper";
import { createSupabaseServerClient } from "./lib/supabase/server";
import Navbar from "@/components/layout/Navbar";
import CallListener from "@/components/CallListener";
import AppInstallPrompt from "@/components/AppInstallPrompt";

export const metadata: Metadata = {
  title: "Mman Plaza",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize Supabase server client
  createSupabaseServerClient();

  return (
    <html lang="en">
      <head>
        {/* ⭐ REQUIRED FOR PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />

        {/* ⭐ REQUIRED FOR iOS PWA INSTALL */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>

      <body className="bg-black">
        <ProvidersWrapper>
          <Navbar />

          {/* ⭐ GLOBAL INCOMING CALL LISTENER */}
          <CallListener />

          {/* ⭐ GLOBAL INSTALL PROMPT */}
          <AppInstallPrompt />

          <div className="contents">{children}</div>

          <div id="modal-root"></div>
        </ProvidersWrapper>
      </body>
    </html>
  );
}
