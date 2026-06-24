// rebuild 003
"use client";

import ProfileClient from "./ProfileClient";

export default function Page({ params }: { params: { userId: string } }) {
  return <ProfileClient userId={params.userId} />;
}
