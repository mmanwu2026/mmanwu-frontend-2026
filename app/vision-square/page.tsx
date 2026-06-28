"use client";

import Link from "next/link";
import TrendingHashtags from "./components/TrendingHashtags";

export default function VisionSquareIndex() {
  return (
    <div className="max-w-2xl mx-auto p-6 text-white">

      {/* Navigation */}
      <div className="mb-6 flex justify-between items-center">

        {/* Back to Plaza */}
        <Link
          href="/plaza"
          className="text-gray-300 hover:text-purple-300 transition"
        >
          ← Plaza
        </Link>

        {/* Upload Vision */}
        <Link
          href="/vision-square/create"
          className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-500"
        >
          + Upload Vision
        </Link>
      </div>

      {/* Header */}
      <h1 className="text-3xl font-bold mb-6">Vision Square</h1>

      <p className="text-gray-400 mb-8">
        Explore visual stories, trending videos, and powerful moments shared by the community.
      </p>

      {/* ⭐ Trending Hashtags */}
      <TrendingHashtags />

      {/* Main Links */}
      <div className="space-y-4">

        <Link
          href="/vision-square/feed"
          className="block bg-gray-800 hover:bg-gray-700 p-4 rounded-lg transition"
        >
          <h2 className="text-xl font-semibold text-purple-200 mb-1">
            Vision Feed
          </h2>
          <p className="text-gray-400 text-sm">
            See the latest uploads from creators across Vision Square.
          </p>
        </Link>

        <Link
          href="/vision-square/trending"
          className="block bg-gray-800 hover:bg-gray-700 p-4 rounded-lg transition"
        >
          <h2 className="text-xl font-semibold text-purple-200 mb-1">
            Trending
          </h2>
          <p className="text-gray-400 text-sm">
            Discover the most uplifting and highest‑spirit posts.
          </p>
        </Link>

        <Link
          href="/vision-square/create"
          className="block bg-gray-800 hover:bg-gray-700 p-4 rounded-lg transition"
        >
          <h2 className="text-xl font-semibold text-purple-200 mb-1">
            Upload to Vision Square
          </h2>
          <p className="text-gray-400 text-sm">
            Share your images or videos with a title and let the community react.
          </p>
        </Link>
      </div>
    </div>
  );
}
