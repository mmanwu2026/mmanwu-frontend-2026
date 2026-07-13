import "./globals.css";
import type { Metadata } from "next";

import ProvidersWrapper from "./providers-wrapper";
import { createSupabaseServerClient } from "./lib/supabase/server";

import CallListener from "@/components/CallListener";
import AppInstallPrompt from "@/components/AppInstallPrompt";
import PushInitializer from "@/app/PushInitializer";

// ⭐ EARLY SERVICE WORKER REGISTRATION
function SWRegisterScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
              .catch(err => console.error('SW registration failed:', err));
          }
        `,
      }}
    />
  );
}

// ⭐ MOBILE PWA RELIABILITY
function MobilePWAReliabilityScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
          }
        `,
      }}
    />
  );
}

export const metadata: Metadata = {
  title: "Mman Plaza",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  createSupabaseServerClient();

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ffffff" />

        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>

      {/* ⭐ BODY MUST NOT OVERRIDE AuthNav THEMES */}
<body className="min-h-screen overflow-x-hidden">
  <SWRegisterScript />
  <MobilePWAReliabilityScript />

  <div id="modal-root"></div>

  {/* ⭐ CallListener MUST be inside ProvidersWrapper */}
  <ProvidersWrapper>
    <PushInitializer />
  <AppInstallPrompt />
    <CallListener />
    {children}
  </ProvidersWrapper>
</body>
    </html>
  );
}
