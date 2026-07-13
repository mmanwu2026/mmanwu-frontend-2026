"use client";

import { usePathname } from "next/navigation";
import AuthNav from "./AuthNav";

export default function AuthNavWrapper() {
  const pathname = usePathname();
  return <AuthNav key={pathname} />;
}
