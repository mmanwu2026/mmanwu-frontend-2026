"use client";

import "./globals.css";
import { UserProvider } from "@/context/UserContext";
import { SupabaseProvider } from "@/context/SupabaseContext";
import AuthNavWrapper from "@/components/AuthNavWrapper";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white" suppressHydrationWarning>
        <SupabaseProvider>
          <UserProvider>
            {children}
            <AuthNavWrapper />   {/* ← Move it BELOW children */}
          </UserProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
