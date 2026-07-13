"use client";

import { usePathname } from "next/navigation";

export default function DebugPage() {
  const pathname = usePathname() ?? "";

  const theme =
    pathname.startsWith("/sound-square")
      ? "bg-teal-600 text-white border-teal-700"
      : pathname.startsWith("/vision-square")
      ? "bg-blue-600 text-white border-blue-700"
      : pathname.startsWith("/messenger")
      ? "bg-green-600 text-white border-green-700"
      : pathname.startsWith("/compose")
      ? "bg-pink-600 text-white border-pink-700"
      : "bg-purple-600 text-white border-purple-700";

  return (
    <div className={`min-h-screen ${theme} p-8`}>
      <h1 className="text-3xl font-bold">Debug Theme Page</h1>
      <p className="mt-4">Pathname: {pathname}</p>
      <p className="mt-2">Applied theme: {theme}</p>
    </div>
  );
}
