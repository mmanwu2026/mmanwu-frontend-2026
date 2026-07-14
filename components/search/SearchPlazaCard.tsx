"use client";

import Link from "next/link";

export default function SearchPlazaCard({ post }) {
  return (
    <Link href={`/plaza/post/${post.id}`}>
      <div className="p-4 bg-gray-900 rounded-lg mb-3">
        <p className="text-gray-200">{post.content}</p>
        <p className="text-xs text-gray-500 mt-2">
          {new Date(post.created_at).toLocaleString()}
        </p>
      </div>
    </Link>
  );
}
