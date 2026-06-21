"use client";

import { useUser } from "@/context/UserContext";
import { redirect } from "next/navigation";

export default function PlazaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();

  if (loading) return null;
  if (!user) redirect("/login");

  return <>{children}</>;
}
