import "./globals.css";
import type { Metadata } from "next";
import ProvidersWrapper from "./providers-wrapper";
import { createSupabaseServerClient } from "./lib/supabase/server";

export const metadata: Metadata = {
  title: "Mmanwu Reactions Plaza",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Initialize Supabase SSR (auth + cookies)
  createSupabaseServerClient();

  return (
    <html lang="en">
      <body className="bg-black">
        <ProvidersWrapper>
          <div className="contents">
            {children}
          </div>
          <div id="modal-root"></div>
        </ProvidersWrapper>
      </body>
    </html>
  );
}
