// Mmanwu Clean Backend – Full Express Server (Patched)

const express = require("express");
const cors = require("cors");

const app = express();

// ⭐ UPDATED CORS — allows local dev + BOTH Vercel frontend domains
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://mmanwu-frontend-2026.vercel.app",
      "https://mmanwu-frontend-2026-rf3cm3bb7-mmanwu2026s-projects.vercel.app"
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

// In-memory storage (temporary until DB is added)
let posts = [];
let users = [];
let reactions = [];
let comments = [];

// ⭐ Auto‑patch old posts so Plaza never crashes
function patchPosts() {
  posts = posts.map((p) => ({
    ...p,
    creatorId: p.creatorId || "demo-creator-123",
    spiritScore: p.spiritScore || 0,
  }));
}

// Root route
app.get("/", (req, res) => {
  res.send("Hello from Mmanwu!");
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "mmanwu-clean",
    timestamp: new Date().toISOString(),
  });
});

// ⭐ Plaza POST route — used by frontend create-post page
app.post("/plaza", (req, res) => {
  const { content, mask } = req.body;

  if (!content) {
    return res.status(400).json({ error: "Content is required" });
  }

  const newPost = {
    id: posts.length + 1,
    content,
    mask: mask || 3,
    creatorId: "demo-creator-123", // TEMPORARY FIX
    spiritScore: 0,
    createdAt: new Date().toISOString(),
  };

  // Add to top of feed
  posts.unshift(newPost);

  res.status(201).json(newPost);
});

// ⭐ Plaza GET route — returns posts array directly
app.get("/plaza", (req, res) => {
  patchPosts(); // ensure all posts have creatorId + spiritScore
  res.json(posts);
});

// ⭐ Reactions + Spirit Score Engine
app.post("/reactions", (req, res) => {
  const { postId, userId, maskTier } = req.body;

  // Validate mask
  if (![1, 2, 3, 4, 5].includes(maskTier)) {
    return res.status(400).json({
      error: "Invalid mask tier. Must be 1, 2, 3, 4, or 5.",
    });
  }

  // Find post
  const post = posts.find((p) => p.id === postId);
  if (!post) {
    return res.status(404).json({ error: "Post not found." });
  }

  // Determine if user is creator
  const isCreator = post.creatorId === userId;

  // Enforce anti-bullying rule
  if ((maskTier === 1 || maskTier === 2) && !isCreator) {
    return res.status(403).json({
      error: "Only the content creator can issue mask #1 or #2.",
    });
  }

  // Record reaction
  const reaction = {
    id: reactions.length + 1,
    postId,
    userId,
    maskTier,
    createdAt: new Date().toISOString(),
  };

  reactions.push(reaction);

  // ⭐ Spirit Score values
  const spiritValues = {
    1: 0, // creator-only
    2: 0, // creator-only
    3: 1,
    4: 3,
    5: 5,
  };

  // Initialize spiritScore if missing
  if (!post.spiritScore) post.spiritScore = 0;

  // Add spirit energy
  post.spiritScore += spiritValues[maskTier];

  // ⭐ Build reaction summary for this post
  const reactionSummary = {
    1: reactions.filter((r) => r.postId === postId && r.maskTier === 1).length,
    2: reactions.filter((r) => r.postId === postId && r.maskTier === 2).length,
    3: reactions.filter((r) => r.postId === postId && r.maskTier === 3).length,
    4: reactions.filter((r) => r.postId === postId && r.maskTier === 4).length,
    5: reactions.filter((r) => r.postId === postId && r.maskTier === 5).length,
  };

  res.status(201).json({
    message: "Reaction recorded successfully.",
    reaction,
    spiritScore: post.spiritScore,
    reactions: reactionSummary,
  });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Mmanwu backend running on port ${PORT}`);
});
