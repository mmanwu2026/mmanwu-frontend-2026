import "./globals.css";
import type { Metadata } from "next";
import ProvidersWrapper from "./providers-wrapper";
import { createSupabaseServerClient } from "./lib/supabase/server";
import Navbar from "@/components/layout/Navbar";
import CallListener from "@/components/CallListener";
import AppInstallPrompt from "@/components/AppInstallPrompt"; // ⭐ Add this import

export const metadata: Metadata = {
  title: "Mman Plaza",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Initialize Supabase server client
  createSupabaseServerClient();

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      </head>

      <body className="bg-black">
        <ProvidersWrapper>
          <Navbar />

          {/* ⭐ GLOBAL INCOMING CALL LISTENER */}
          <CallListener />

          {/* ⭐ GLOBAL INSTALL PROMPT */}
          {/* This ensures the PWA install button appears anywhere in the app */}
          <AppInstallPrompt />

          <div className="contents">{children}</div>
          <div id="modal-root"></div>
        </ProvidersWrapper>
      </body>
    </html>
  );
}
