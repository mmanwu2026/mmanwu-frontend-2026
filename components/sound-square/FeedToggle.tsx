
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function FeedToggle() {
  const pathname = usePathname() ?? "";
  const isTrending = pathname.includes("trending");

  return (
    <div className="flex space-x-4 mb-6">
      <Link
        href="/sound-square/feed"
        className={`
          px-3 py-1 rounded-lg transition
          ${!isTrending ? "bg-purple-600 text-white" : "text-gray-300 hover:text-purple-300"}
        `}
      >
        For You
      </Link>

      <Link
        href="/sound-square/trending"
        className={`
          px-3 py-1 rounded-lg transition
          ${isTrending ? "bg-purple-600 text-white" : "text-gray-300 hover:text-purple-300"}
        `}
      >
        Trending
      </Link>
    </div>
  );
}
