"use client";

import { Providers } from "@/app/providers";

export default function ProfileUserLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
