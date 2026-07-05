import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import ProfileClient from "@/components/ProfileClient";
import TopBar from "@/components/navigation/TopBar";

type Post = {
  id: string;
  creator_id: string;
  content: string;
  created_at: string;
  spirit_score: number;
  automask: number | null;
  positivity_ratio: number;
};

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;

  // ⭐ YOUR PROJECT REQUIRES AWAIT HERE
  const cookieStore = await cookies();

  // ⭐ Wrap cookieStore into Supabase's expected interface
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // ignore SSR write errors
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // ignore SSR write errors
          }
        },
      },
    }
  );

  const { data: profileRaw, error: profileError } = await supabase
    .from("profiles")
    .select(`
      id,
      username,
      display_name,
      avatar_url,
      bio,
      mask_tier,
      created_at,
      verified,
      location,
      website_url,

      followers_count:follows!follows_following_id_fkey(count),
      following_count:follows!follows_follower_id_fkey(count),

      posts:posts!posts_creator_id_fkey (
        id,
        spirit_score,
        positivity_ratio
      )
    `)
    .eq("id", id)
    .single();

  const profileNotFound = profileError || !profileRaw;

  let profile = null;
  let posts: Post[] = [];

  if (!profileNotFound) {
    const spirit_score =
      profileRaw.posts?.reduce(
        (sum: number, p: any) => sum + (p.spirit_score ?? 0),
        0
      ) ?? 0;

    const positivity_ratio =
      profileRaw.posts?.length > 0
        ? profileRaw.posts.reduce(
            (sum: number, p: any) => sum + (p.positivity_ratio ?? 0),
            0
          ) / profileRaw.posts.length
        : 0.5;

    profile = {
      ...profileRaw,
      followers_count: profileRaw.followers_count?.[0]?.count ?? 0,
      following_count: profileRaw.following_count?.[0]?.count ?? 0,
      spirit_score,
      positivity_ratio,
    };

    const { data: postsRaw } = await supabase
      .from("posts")
      .select(`
        id,
        creator_id,
        content,
        created_at,
        spirit_score,
        automask,
        positivity_ratio
      `)
      .eq("creator_id", id)
      .order("created_at", { ascending: false });

    posts = postsRaw ?? [];
  }

  return (
    <div className="p-6 text-white">
      <TopBar />
      {profileNotFound ? (
        <div className="mt-6 text-lg">Profile not found</div>
      ) : (
        <ProfileClient profile={profile!} posts={posts} />
      )}
    </div>
  );
}
