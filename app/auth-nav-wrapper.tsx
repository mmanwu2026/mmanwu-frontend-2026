"use client";

import AuthNav from "@/components/AuthNav";
import { useUser } from "@/context/UserContext";

export default function AuthNavWrapper() {
  const { loading } = useUser();
  if (loading) return null;
  return <AuthNav />;
}
