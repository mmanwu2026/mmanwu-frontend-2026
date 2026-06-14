"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="p-6 space-y-6">
      {/* Top Navigation */}
      <div className="flex justify-between items-center">
        <Link href="/plaza" className="text-purple-600 font-semibold">
          Mmanwu Plaza
        </Link>

        <Link href="/profile/me" className="text-purple-600 font-semibold">
          My Profile
        </Link>
      </div>

      {/* Welcome Section */}
      <div className="text-center mt-20">
        <h1 className="text-4xl font-bold">Welcome to Mmanwu</h1>
        <p className="text-gray-500 mt-2">Select a section to begin.</p>
      </div>
    </div>
  );
}
