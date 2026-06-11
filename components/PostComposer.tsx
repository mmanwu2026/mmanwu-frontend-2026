async function submitPost() {
  if (!content.trim()) return;

  setLoading(true);
  setError("");

  try {
    const res = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/plaza`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        creatorId: "viewer-demo-001",
        content,
        mask: maskTier,
      }),
    });

    if (!res.ok) throw new Error("Failed to create post");

    setContent("");
    setMaskTier(3);
    onPostCreated();
  } catch (err: any) {
    setError(err.message || "Error creating post");
  } finally {
    setLoading(false);
  }
}
