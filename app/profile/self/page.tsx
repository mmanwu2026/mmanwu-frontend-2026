"use client";

import { redirect } from "next/navigation";
import { useUser } from "@/context/UserContext";

export const dynamic = "force-dynamic";

export default function ProfileMeRedirect() {
  const { user, loading } = useUser();

  if (loading) return null;

  if (!user) {
    redirect("/login");
  }

  redirect(`/profile/${user.id}`);
}
