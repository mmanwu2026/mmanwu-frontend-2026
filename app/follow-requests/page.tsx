import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import FollowRequestsClient from "@/app/components/FollowRequestsClient";
import TopBar from "@/components/navigation/TopBar";

export default async function FollowRequestsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const viewerId = session?.user?.id;

  if (!viewerId) {
    return (
      <div className="p-6 text-white">
        <TopBar />
        <div className="mt-6">You must be logged in to view follow requests.</div>
      </div>
    );
  }

  // ⭐ Fetch pending follow requests
  const { data: requests } = await supabase
    .from("follow_requests")
    .select(`
      id,
      requester_id,
      created_at,
      requester:profiles!requester_id (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq("target_id", viewerId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 text-white">
      <TopBar />
      <FollowRequestsClient requests={requests ?? []} />
    </div>
  );
}
