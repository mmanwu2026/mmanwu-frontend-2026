"use client";

import { useParams } from "next/navigation";
import { useSupabase } from "@/context/SupabaseContext";
import { useState, useEffect } from "react";
import CallRoom from "@/components/call/CallRoom";

export default function CallPage() {
  const params = useParams();
  const roomId = params?.roomId as string;

  const supabase = useSupabase();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const session = await supabase.auth.getSession();
      setUserId(session.data.session?.user?.id ?? null);
    }
    loadUser();
  }, [supabase]);

  if (!userId) {
    return <div className="p-6 text-white">Loading user…</div>;
  }

  return <CallRoom userId={userId} roomId={roomId} />;
}
