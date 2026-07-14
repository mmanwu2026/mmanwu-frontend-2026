"use client";

import { useEffect } from "react";
import { useSupabase } from "@/app/context/SupabaseContext";
import { registerPushToken } from "@/src/push/registerPushToken";

export default function PushInitializer() {
  const { supabase, user } = useSupabase();

  useEffect(() => {
    if (!user) return;

    console.log("PushInitializer → registering FCM token for:", user.id);

    registerPushToken(user.id, supabase);
  }, [user]);

  return null;
}
