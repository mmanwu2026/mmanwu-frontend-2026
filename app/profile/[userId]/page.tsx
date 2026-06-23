"use client";

export const dynamic = "force-dynamic";

import ProfileClient from "./ProfileClient";

export default function Page({ params }: { params: { userId: string } }) {
  return <ProfileClient userId={params.userId} />;
}
