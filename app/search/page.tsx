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
}

interface PlazaResult {
  id: string;
  content: string;
  created_at: string;
}

interface VisionResult {
  id: string;
  title: string;
  image_url: string;
  created_at: string;
}

interface SoundResult {
  id: string;
  title: string;
  audio_url: string;
  created_at: string;
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
    const [profiles, plaza, vision, sound, messenger] = await Promise.all([
      supabase.from("profiles")
        .select("id, username, avatar_url")
        .ilike("username", `%${q}%`),

      supabase.from("plaza_posts")
        .select("id, content, created_at")
        .ilike("content", `%${q}%`),

      supabase.from("vision_posts")
        .select("id, title, image_url, created_at")
        .ilike("title", `%${q}%`),

      supabase.from("sound_posts")
        .select("id, title, audio_url, created_at")
        .ilike("title", `%${q}%`),

      supabase.from("profiles")
        .select("id, username, avatar_url")
        .ilike("username", `%${q}%`)
    ]);

    setResults({
      profiles: profiles.data ?? [],
      plaza: plaza.data ?? [],
      vision: vision.data ?? [],
      sound: sound.data ?? [],
      messenger: messenger.data ?? [],
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

        {/* People */}
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

        {/* Plaza */}
        {results.plaza.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-3">Plaza Posts</h2>
            {results.plaza.map((post) => (
              <SearchPlazaCard key={post.id} post={post} />
            ))}
          </section>
        )}

        {/* Vision */}
        {results.vision.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-3">VisionSquare</h2>
            {results.vision.map((post) => (
              <SearchVisionCard key={post.id} post={post} />
            ))}
          </section>
        )}

        {/* Sound */}
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
