"use client";

import Link from "next/link";

export default function SearchVisionCard({ post }) {
  return (
    <Link href={`/vision-square/post/${post.id}`}>
      <div className="p-4 bg-gray-900 rounded-lg mb-3">
        <img
          src={post.image_url}
          className="w-full h-48 object-cover rounded-lg mb-3"
        />
        <p className="text-gray-200">{post.title}</p>
      </div>
    </Link>
  );
}
