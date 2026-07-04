import SoundPostCard from "@/components/sound-square/SoundPostCard";
import { loadSoundPosts } from "./_server/loadSoundPosts";

export default async function SoundSquarePage() {
  const posts = await loadSoundPosts();

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {posts.length === 0 && (
          <p className="text-zinc-500 text-center">No sounds yet.</p>
        )}

        {posts.map((post) => (
          <SoundPostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
