import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { text } = await req.json();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  // 1️⃣ Emotion analysis
  const analysisRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
Analyze the user's message and return ONLY JSON:
{
  "emotion": "...",
  "intensity": 0-1,
  "toxicity": 0-1,
  "bullying": 0-1,
  "clarity": 0-1
}
          `,
        },
        { role: "user", content: text },
      ],
      temperature: 0,
    }),
  });

  const analysisJson = await analysisRes.json();
  let analysis;

  try {
    analysis = JSON.parse(analysisJson?.choices?.[0]?.message?.content || "{}");
  } catch {
    analysis = { emotion: "neutral", intensity: 0, toxicity: 0, bullying: 0, clarity: 1 };
  }

  const { emotion, toxicity, bullying, clarity } = analysis;
  const positive = ["joy", "excitement", "gratitude", "pride", "relief", "celebration"];

  if (positive.includes(emotion) && toxicity < 0.1 && bullying < 0.1 && clarity >= 0.4) {
    return NextResponse.json({ autoApprove: true });
  }

  // 2️⃣ Generate rewrites — NEW PROMPT INSERTED HERE
  const rewriteRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are the Mmanwu Gatekeeper.

Your job is to transform the user's message into three DISTINCT emotional tones.

You MUST rewrite the message — do NOT repeat the original wording.

Produce EXACTLY this JSON array:

[
  { "label": "Calm", "text": "a calmer, softened rewrite", "explanation": "why this version is calmer" },
  { "label": "Direct", "text": "a clearer, more concise rewrite", "explanation": "why this version is more direct" },
  { "label": "Elevated", "text": "a more expressive, refined rewrite", "explanation": "why this version is elevated" }
]

CRITICAL RULES:
- Return ONLY valid JSON.
- No markdown.
- No backticks.
- No commentary outside the JSON.
- The rewrites MUST differ from each other.
- The rewrites MUST differ from the original text.
- The rewrites MUST preserve the user's emotional truth.
- The rewrites MUST NOT be identical.
- The rewrites MUST NOT copy the original text.
          `,
        },
        { role: "user", content: text },
      ],
      temperature: 0.9, // ⭐ More creativity
    }),
  });

  const rewriteJson = await rewriteRes.json();
  let rewrites;

  try {
    const raw = rewriteJson?.choices?.[0]?.message?.content || "[]";

    const cleaned = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    rewrites = JSON.parse(cleaned);
  } catch {
    rewrites = [];
  }

  // 3️⃣ Final safety filter — ensure valid objects
  if (!Array.isArray(rewrites)) rewrites = [];

  rewrites = rewrites.filter(
    (r) =>
      r &&
      typeof r.label === "string" &&
      typeof r.text === "string" &&
      r.text.trim().length > 0
  );

  // 4️⃣ If still empty, generate fallback rewrites
  if (rewrites.length === 0) {
    rewrites = [
      {
        label: "Calm",
        text: `I’m taking a moment to express this more gently: ${text}`,
        explanation: "A softened, steady version of your message.",
      },
      {
        label: "Direct",
        text: `Here’s the clear, distilled version: ${text}`,
        explanation: "A clear, straightforward version of your message.",
      },
      {
        label: "Elevated",
        text: `Allow me to refine and elevate your message: ${text}`,
        explanation: "A more expressive, refined version of your message.",
      },
    ];
  }

  return NextResponse.json({ autoApprove: false, rewrites });
}
