// rebuild 004
"use client";

import ProfileClient from "./ProfileClient";

export default function Page({ params }: { params: { id: string } }) {
  return <ProfileClient userId={params.id} />;
}
