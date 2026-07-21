"use client";

import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

export default function LogoutPage() {
  // Create a Supabase client using your environment variables
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fullLogout() {
      try {
        // 1. Supabase logout
        await supabase.auth.signOut();

        // 2. Clear all storage
        localStorage.clear();
        sessionStorage.clear();

        // 3. Clear IndexedDB (Supabase stores auth here)
        const databases = await indexedDB.databases();
        for (const db of databases) {
          if (db.name) indexedDB.deleteDatabase(db.name);
        }

        // 4. Unregister all service workers
        if (navigator.serviceWorker) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) {
            await reg.unregister();
          }
        }

        // 5. Clear caches
        if (window.caches) {
          const cacheNames = await caches.keys();
          for (const name of cacheNames) {
            await caches.delete(name);
          }
        }

        // 6. Hard reload
        window.location.href = "/";
      } catch (err) {
        console.error("Logout error:", err);
        window.location.href = "/";
      }
    }

    fullLogout();
  }, []);

  return (
    <div className="p-6 text-center text-gray-600">
      Logging out…
    </div>
  );
}
