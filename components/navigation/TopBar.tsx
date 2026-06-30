"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TopBar() {
  const pathname = usePathname() ?? "";

  const isSoundSquare = pathname.startsWith("/sound-square");
  const isProfile = pathname.startsWith("/profile");

  return (
    <div className="w-full flex items-center justify-between mb-6 px-2">
      {/* Back to Plaza */}
      <Link
        href="/plaza"   // ⭐ Correct route based on your real URL
        className="text-gray-300 hover:text-purple-300 transition font-medium"
      >
        ← Back to Plaza
      </Link>

      {/* Right-side actions */}
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

      {isProfile && (
        <div className="text-gray-500 text-sm"></div>
      )}
    </div>
  );
}
