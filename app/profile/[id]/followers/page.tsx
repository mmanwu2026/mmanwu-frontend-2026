// app/profile/[id]/followers/page.tsx
import FollowersClient from "@/app/followers/FollowersClient";

export default async function FollowersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <FollowersClient profileId={id} />;
}
