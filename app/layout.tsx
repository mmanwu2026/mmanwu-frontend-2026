import "./globals.css";
import type { Metadata } from "next";
import ProvidersWrapper from "./providers-wrapper";
import { createSupabaseServerClient } from "./lib/supabase/server";
import Navbar from "@/components/layout/Navbar";
import CallListener from "@/components/CallListener";
import AppInstallPrompt from "@/components/AppInstallPrompt";
import PushInitializer from "@/app/PushInitializer"; // ⭐ GLOBAL PUSH SUBSCRIPTION

// ⭐ EARLY SERVICE WORKER REGISTRATION (Safari requires pre-hydration)
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

// ⭐ MOBILE PWA KEEP-ALIVE + NOTIFICATION PERMISSION
function MobilePWAReliabilityScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              navigator.serviceWorker.ready.then(reg => {
                reg.active?.postMessage({ type: 'KEEP_ALIVE' });
              });
            }
          });

          // Request Notification permission early (foreground call alerts)
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
        {/* ⭐ SERVICE WORKER MUST REGISTER BEFORE HYDRATION */}
        <SWRegisterScript />

        {/* ⭐ MOBILE PWA RELIABILITY (KEEP-ALIVE + Notification permission) */}
        <MobilePWAReliabilityScript />

        <ProvidersWrapper>
          <Navbar />

          {/* ⭐ GLOBAL PUSH SUBSCRIPTION */}
          <PushInitializer />

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
