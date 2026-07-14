"use client";

import ProvidersWrapper from "./providers-wrapper";
import CallListener from "@/components/CallListener";
import AppInstallPrompt from "@/components/AppInstallPrompt";
import PushInitializer from "@/app/PushInitializer";

// ⭐ REGISTER FIREBASE SERVICE WORKER (REQUIRED FOR FCM PUSH)
function SWRegisterScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/firebase-messaging-sw.js')
              .then(() => console.log('Firebase SW registered'))
              .catch(err => console.error('SW registration failed:', err));
          }
        `,
      }}
    />
  );
}

// ⭐ MOBILE PWA RELIABILITY (OPTIONAL BUT GOOD)
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

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SWRegisterScript />
      <MobilePWAReliabilityScript />

      <div id="modal-root"></div>

      <ProvidersWrapper>
        <PushInitializer />
        <AppInstallPrompt />
        <CallListener />

        <div className="pt-20">
          {children}
        </div>
      </ProvidersWrapper>
    </>
  );
}
