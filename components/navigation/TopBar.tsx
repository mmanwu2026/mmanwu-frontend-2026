"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TopBar() {
  const pathname = usePathname() ?? "";

  const isSoundSquare = pathname.startsWith("/sound-square");
  const isVisionSquare = pathname.startsWith("/vision-square");

  return (
    <div className="w-full flex items-center justify-end mb-6 px-2">
      {/* Page-specific actions only */}
      {isSoundSquare && (
        <Link
          href="/sound-square/create"
          className="
            bg-purple-600 px-4 py-2 rounded-lg text-white
            hover:bg-purple-500 transition
          "
        >
          + Upload Sound
        </Link>
      )}

      {isVisionSquare && (
        <Link
          href="/vision-square/create"
          className="
            bg-purple-600 px-4 py-2 rounded-lg text-white
            hover:bg-purple-500 transition
          "
        >
          + Upload Vision
        </Link>
      )}
    </div>
  );
}
