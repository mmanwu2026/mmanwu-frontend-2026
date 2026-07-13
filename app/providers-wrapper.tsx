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

        <div className="flex-1 flex flex-col">
          <div className="fixed top-0 left-0 w-full z-[1000]">
            <AuthNav />
          </div>

          <UpdateBanner />
          <SWRegister />

          <div className="pt-[60px] pb-[80px] flex-1">
            {children}
          </div>

          <BottomNav />
        </div>

      </UnreadProvider>
    </ClientProviders>
  );
}

