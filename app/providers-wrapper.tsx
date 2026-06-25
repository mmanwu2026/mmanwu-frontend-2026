"use client";

import { Providers } from "./providers";
import AuthNavWrapper from "./auth-nav-wrapper";

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AuthNavWrapper />
      {children}
    </Providers>
  );
}
