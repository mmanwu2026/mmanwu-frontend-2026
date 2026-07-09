"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// ✔ Correct Supabase provider path
import { useSupabase } from "../context/SupabaseContext";

// ✔ Correct push system path (your real file)
import { registerPush } from "../utils/push";

export default function EnableNotifications() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(false);

  async function handleEnable() {
    try {
      setLoading(true);

      // 1. Restore session
      const session = await supabase.auth.getSession();
      const user = session.data.session?.user;

      if (!user) {
        alert("You must be logged in.");
        setLoading(false);
        return;
      }

      // 2. Ask for permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Notifications were not enabled.");
        setLoading(false);
        return;
      }

      // 3. Use your existing push system
      await registerPush(supabase);

      // 4. Redirect AFTER subscription succeeds
      router.replace("/plaza");
    } catch (err) {
      console.error("Push setup failed:", err);
      alert("Could not enable notifications.");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleEnable}
      disabled={loading}
      style={{
        marginTop: 20,
        padding: "12px 24px",
        background: "#ffffff22",
        border: "1px solid #ffffff55",
        borderRadius: 8,
        color: "white",
        fontSize: "1rem",
        cursor: "pointer",
      }}
    >
      {loading ? "Enabling…" : "Enable Notifications"}
    </button>
  );
}
