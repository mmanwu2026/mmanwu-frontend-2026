import "./globals.css";
import type { Metadata } from "next";
import ProvidersWrapper from "./providers-wrapper";
import { createSupabaseServerClient } from "./lib/supabase/server";
import Navbar from "@/components/layout/Navbar";
import CallListener from "@/components/CallListener"; // ⭐ Add this import

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
          {/* This runs everywhere in the app, safely */}
          <CallListener />

          <div className="contents">{children}</div>
          <div id="modal-root"></div>
        </ProvidersWrapper>
      </body>
    </html>
  );
}
