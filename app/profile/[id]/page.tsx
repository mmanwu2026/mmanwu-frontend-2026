"use client";

import dynamic from "next/dynamic";

const ProfileClient = dynamic(() => import("@/components/ProfileClient"), {
  ssr: false,
});

export default function Page({ params }: { params: { id: string } }) {
  return (
    <div className="w-full min-h-screen">
      <ProfileClient userId={params.id} />
    </div>
  );
}
