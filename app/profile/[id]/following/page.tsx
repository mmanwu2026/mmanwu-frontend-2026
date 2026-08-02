import TopBar from "@/components/navigation/TopBar";
import FollowingClient from "@/app/following/FollowingClient";

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="p-6 text-white">
      <TopBar />
      <h1 className="text-2xl font-bold mb-4">Following</h1>
      <FollowingClient profileId={id} />
    </div>
  );
}
