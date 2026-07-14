// app/sound-square/page.tsx
import { loadSoundPosts } from "./_server/loadSoundPosts";
import SoundPostCard from "@/components/sound-square/SoundPostCard";
import TopBar from "@/components/navigation/TopBar";

export default async function SoundSquarePage() {
  // ⭐ SERVER-SIDE DATA FETCH
  const posts = await loadSoundPosts();

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      <TopBar />

      <h1 className="text-2xl font-bold mb-4">Sound Square</h1>

      <div className="space-y-6">
        {posts.map((post) => (
          <SoundPostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
