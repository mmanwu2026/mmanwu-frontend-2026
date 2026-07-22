"use client";

import { useSupabase } from "@/app/context/SupabaseContext";
import { useState, useEffect } from "react";
import Link from "next/link";

import SearchPlazaCard from "@/components/search/SearchPlazaCard";
import SearchVisionCard from "@/components/search/SearchVisionCard";
import SearchSoundCard from "@/components/search/SearchSoundCard";

interface ProfileResult {
  id: string;
  username: string;
  avatar_url: string | null;
  privacy_type: "public" | "private";
}

interface PlazaResult {
  id: string;
  content: string;
  created_at: string;
  creator_id: string;
}

interface VisionResult {
  id: string;
  title: string;
  image_url: string;
  created_at: string;
  creator_id: string;
}

interface SoundResult {
  id: string;
  title: string;
  audio_url: string;
  created_at: string;
  creator_id: string;
}

interface SearchResults {
  profiles: ProfileResult[];
  plaza: PlazaResult[];
  vision: VisionResult[];
  sound: SoundResult[];
  messenger: ProfileResult[];
}

export default function GlobalSearchPage() {
  const { supabase } = useSupabase();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    profiles: [],
    plaza: [],
    vision: [],
    sound: [],
    messenger: [],
  });

  useEffect(() => {
    if (!query.trim()) {
      setResults({
        profiles: [],
        plaza: [],
        vision: [],
        sound: [],
        messenger: [],
      });
      return;
    }

    const timeout = setTimeout(() => {
      runSearch(query);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  async function runSearch(q: string) {
    const session = await supabase.auth.getSession();
    const viewerId = session.data.session?.user?.id ?? null;

    const [profilesRes, plazaRes, visionRes, soundRes, messengerRes] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, avatar_url, privacy_type")
          .ilike("username", `%${q}%`),

        supabase
  .from("posts")
  .select("id, content, created_at, creator_id, privacy_type")
  .ilike("content", `%${q}%`),

        supabase
          .from("vision_posts")
          .select("id, title, image_url, created_at, creator_id")
          .ilike("title", `%${q}%`),

        supabase
          .from("sound_posts")
          .select("id, title, audio_url, created_at, creator_id")
          .ilike("title", `%${q}%`),

        supabase
          .from("profiles")
          .select("id, username, avatar_url, privacy_type")
          .ilike("username", `%${q}%`)
      ]);

    const profiles = profilesRes.data ?? [];
    const messenger = messengerRes.data ?? [];

    // ⭐ FIX: Private profiles MUST appear in search
    const filteredProfiles: ProfileResult[] = [...profiles];
    const filteredMessenger: ProfileResult[] = [...messenger];

    // ⭐ Posts MUST respect privacy
    async function filterPosts<T extends { creator_id: string }>(posts: T[]): Promise<T[]> {
      const output: T[] = [];

      for (const post of posts) {
        const { data: creatorRows } = await supabase
          .from("profiles")
          .select("privacy_type")
          .eq("id", post.creator_id)
          .limit(1);

        const creator = creatorRows?.[0];
        if (!creator) continue;

        if (creator.privacy_type !== "private") {
          output.push(post);
          continue;
        }

        if (!viewerId) continue;

        const { data: followRows } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", viewerId)
          .eq("following_id", post.creator_id)
          .limit(1);

        if (followRows?.[0]) output.push(post);
      }

      return output;
    }

    const filteredPlaza = await filterPosts<PlazaResult>(plazaRes.data ?? []);
    const filteredVision = await filterPosts<VisionResult>(visionRes.data ?? []);
    const filteredSound = await filterPosts<SoundResult>(soundRes.data ?? []);

    setResults({
      profiles: filteredProfiles,
      plaza: filteredPlaza,
      vision: filteredVision,
      sound: filteredSound,
      messenger: filteredMessenger,
    });
  }

  return (
    <div className="p-6">
      <input
        type="text"
        placeholder="Search people, posts, sounds, videos…"
        className="w-full p-3 rounded bg-gray-800 text-white"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="mt-6 space-y-8">

        {results.profiles.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-3">People</h2>
            {results.profiles.map((p) => (
              <Link key={p.id} href={`/profile/${p.id}`}>
                <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg mb-2">
                  <img
                    src={p.avatar_url ?? "/icons/icon-192x192.png"}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <span>{p.username}</span>
                </div>
              </Link>
            ))}
          </section>
        )}

        {results.plaza.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-3">Plaza Posts</h2>
            {results.plaza.map((post) => (
              <SearchPlazaCard key={post.id} post={post} />
            ))}
          </section>
        )}

        {results.vision.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-3">VisionSquare</h2>
            {results.vision.map((post) => (
              <SearchVisionCard key={post.id} post={post} />
            ))}
          </section>
        )}

        {results.sound.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-3">SoundSquare</h2>
            {results.sound.map((post) => (
              <SearchSoundCard key={post.id} post={post} />
            ))}
          </section>
        )}

      </div>
    </div>
  );
}
