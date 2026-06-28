"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function SoundCommentList({ postId }: { postId: string }) {
  const [comments, setComments] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/sound-comments?post_id=${postId}`);
      const data = await res.json();
      setComments(data.comments || []);
    }
    load();
  }, [postId]);

  if (comments.length === 0) {
    return <p className="text-white/40 mt-6">No comments yet…</p>;
  }

  return (
    <div className="mt-8 space-y-4">
      {comments.map((c) => (
        <div key={c.id} className="border border-white/10 p-4 rounded bg-neutral-900/40">
          <Link href={`/profile/${c.user_id}`} className="text-purple-300 hover:text-purple-400 underline">
            @{c.username}
          </Link>

          <p className="mt-2 text-white">{c.content}</p>

          <p className="text-xs text-white/40 mt-1">
            {new Date(c.created_at).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
