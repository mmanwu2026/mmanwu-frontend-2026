"use client";

import { ClientProviders } from "./client-providers";
import AuthNav from "@/app/components/AuthNav";
import { UnreadProvider } from "@/app/context/UnreadContext";
import SWRegister from "./sw-register";
import UpdateBanner from "@/components/UpdateBanner";
import BottomNav from "@/app/components/BottomNav";

export default function ProvidersWrapper({ children }) {
  return (
    <ClientProviders>
      <UnreadProvider>

        {/* ⭐ Top navigation — highest stacking layer */}
        <div className="fixed top-0 left-0 w-full z-[2147483647] pointer-events-auto">
          <AuthNav />
        </div>

        <UpdateBanner />
        <SWRegister />

        {/* ⭐ Page content — MUST stay below navbars */}
        <div className="pt-[60px] pb-[70px] w-full relative z-0">
          {children}
        </div>

        {/* ⭐ Bottom navigation — same highest stacking layer */}
        <div className="fixed bottom-0 left-0 w-full z-[2147483647] pointer-events-auto">
          <BottomNav />
        </div>

      </UnreadProvider>
    </ClientProviders>
  );
}
