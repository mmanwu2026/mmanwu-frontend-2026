"use client";

import { useUser } from "@/context/UserContext";
import { redirect } from "next/navigation";

export default function PlazaLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();

  // 1. While loading, do nothing
  if (loading) {
    return null;
  }

  // 2. If user is still undefined/null AFTER loading, redirect
  if (!user) {
    redirect("/login");
  }

  // 3. Otherwise, render Plaza
  return <>{children}</>;
}
