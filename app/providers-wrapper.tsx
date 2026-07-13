"use client";

import { ClientProviders } from "./client-providers";
import AuthNavWrapper from "@/app/components/AuthNavWrapper";
import { UnreadProvider } from "@/app/context/UnreadContext";
import SWRegister from "./sw-register";
import UpdateBanner from "@/components/UpdateBanner";
import BottomNav from "@/app/components/BottomNav";

export default function ProvidersWrapper({ children }) {
  return (
    <ClientProviders>
      <UnreadProvider>

        <div className="flex flex-col h-full min-h-0">

          {/* Top nav */}
          <div className="fixed top-0 left-0 w-full z-[1000]">
            <AuthNavWrapper />
          </div>

          <UpdateBanner />
          <SWRegister />

          {/* Composer */}
          <div className="w-full bg-neutral-800 text-white px-4 py-3 flex items-center justify-center border-b border-neutral-700 mt-[60px]">
            <a
              href="/compose"
              className="bg-purple-600 px-4 py-2 rounded-full font-medium hover:bg-purple-500 transition"
            >
              + Compose
            </a>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 min-h-0 pb-[80px] overflow-y-auto">
            {children}
          </div>

          {/* Bottom nav */}
          <BottomNav />

        </div>

      </UnreadProvider>
    </ClientProviders>
  );
}
