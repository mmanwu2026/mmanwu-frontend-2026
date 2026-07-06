"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useSupabase } from "@/context/SupabaseContext";
import { useEffect, useState } from "react";
import CallRoom from "@/components/call/CallRoom";

export default function CallPage() {
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();

  const roomIdParam = params?.roomId ?? "";
  const roleParam =
    (searchParams?.get("role") as "caller" | "callee") ?? "callee";

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
    return <div className="p-6 text-white">Loading call…</div>;
  }

  return (
    <CallRoom
      userId={userId}
      roomId={roomIdParam}
      role={roleParam}
    />
  );
}
