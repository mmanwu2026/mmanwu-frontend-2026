"use client";

import "./globals.css";
import { UserProvider } from "@/context/UserContext";
import dynamic from "next/dynamic";

// ⭐ AuthNav must be client-only — disable SSR
const AuthNav = dynamic(() => import("@/components/AuthNav"), {
  ssr: false,
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <UserProvider>
          <AuthNav />
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
