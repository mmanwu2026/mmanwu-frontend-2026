"use client";

import ProfileClient from "@/components/ProfileClient";

export default function Page({ params }: { params: { id: string } }) {
  return <ProfileClient userId={params.id} />;
}
