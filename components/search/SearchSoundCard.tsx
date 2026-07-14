"use client";

import Link from "next/link";

export default function SearchSoundCard({ post }) {
  return (
    <Link href={`/sound-square/post/${post.id}`}>
      <div className="p-4 bg-gray-900 rounded-lg mb-3">
        <p className="text-gray-200">{post.title}</p>
        <audio controls src={post.audio_url} className="mt-2 w-full" />
      </div>
    </Link>
  );
}
