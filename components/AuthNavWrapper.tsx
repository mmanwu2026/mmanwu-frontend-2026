"use client";

import dynamic from "next/dynamic";

const AuthNav = dynamic(() => import("./AuthNav"), {
  ssr: false,
});

export default function AuthNavWrapper() {
  return <AuthNav />;
}
