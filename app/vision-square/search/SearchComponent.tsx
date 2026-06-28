"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import VisionCard from "@/app/vision-square/components/VisionCard";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function SearchComponent() {
  const supabase = useSupabase();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const tagParam = searchParams.get("tag");

  useEffect(() => {
    if (tagParam) {
      const tagQuery = `#${tagParam}`;
      setQuery(tagQuery);
      handleSearch(tagQuery);
    }
  }, [tagParam]);

  async function handleSearch(forcedQuery?: string) {
    const q = forcedQuery || query;
    if (!q.trim()) return;

    setLoading(true);
    setSearched(true);

    const cleaned = q.replace("#", "").toLowerCase();
    const isHashtag = q.startsWith("#");

    let data, error;

    if (isHashtag) {
      ({ data, error } = await supabase
        .from("vision_posts")
        .select("*, profiles(username)")
        .contains("tags", [cleaned])
        .order("created_at", { ascending: false }));
    } else {
      ({ data, error } = await supabase
        .from("vision_posts")
        .select("*, profiles(username)")
        .or(
          `title.ilike.%${cleaned}%, profiles.username.ilike.%${cleaned}%, tags.cs.{${cleaned}}`
        )
        .order("created_at", { ascending: false }));
    }

    if (error) {
      console.error("Search error:", error);
      setLoading(false);
      return;
    }

    setResults(data || []);
    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto p-6 text-white">

      <div className="mb-6 flex justify-between items-center">
        <Link
          href="/plaza"
          className="text-gray-300 hover:text-purple-300 transition"
        >
          ← Plaza
        </Link>

        <Link
          href="/vision-square/create"
          className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-500"
        >
          + Upload Vision
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">Search VisionSquare</h1>

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search title, creator, or #hashtag…"
          className="flex-1 p-2 rounded bg-gray-700"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <button
          onClick={() => handleSearch()}
          className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-500"
        >
          Search
        </button>
      </div>

      {loading && <p className="text-gray-400">Searching…</p>}

      {searched && !loading && results.length === 0 && (
        <p className="text-gray-500">No results found.</p>
      )}

      {results.map((post) => (
        <VisionCard key={post.id} post={post} />
      ))}
    </div>
  );
}
