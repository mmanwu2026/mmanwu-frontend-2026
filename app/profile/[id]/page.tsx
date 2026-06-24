export const dynamic = "force-dynamic";
export const revalidate = 0;

import ProfileClient from "@/components/ProfileClient";

export default function Page({ params }: { params: { id: string } }) {
  return (
    <div className="w-full min-h-screen">
      <ProfileClient userId={params.id} />
    </div>
  );
}
