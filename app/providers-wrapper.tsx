"use client";

import { ClientProviders } from "./client-providers";
import AuthNavWrapper from "./auth-nav-wrapper";
import { SWRegister } from "./sw-register";
import { PushSubscribe } from "./push-subscribe";

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClientProviders>
      <SWRegister />
      <PushSubscribe />

      <AuthNavWrapper />
      {children}
    </ClientProviders>
  );
}
