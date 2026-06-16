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

  // 2️⃣ Generate rewrites (bulletproof JSON-only prompt)
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

Rewrite the user's message into EXACTLY this JSON array:

[
  { "label": "Calm", "text": "rewritten text", "explanation": "why this rewrite is calmer" },
  { "label": "Direct", "text": "rewritten text", "explanation": "why this rewrite is more direct" },
  { "label": "Elevated", "text": "rewritten text", "explanation": "why this rewrite is more expressive" }
]

CRITICAL RULES:
- Return ONLY valid JSON.
- No commentary.
- No markdown.
- No backticks.
- No code blocks.
- No text before or after the JSON.
- No wrapping the JSON in quotes.
- No trailing commas.
- No extra fields.
- No explanations outside the JSON.
          `,
        },
        { role: "user", content: text },
      ],
      temperature: 0.7,
    }),
  });

  const rewriteJson = await rewriteRes.json();
  let rewrites;

  try {
    const raw = rewriteJson?.choices?.[0]?.message?.content || "[]";

    // Remove markdown fences if present
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
        text: text,
        explanation: "A softened, steady version of your message.",
      },
      {
        label: "Direct",
        text: text,
        explanation: "A clear, straightforward version of your message.",
      },
      {
        label: "Elevated",
        text: text,
        explanation: "A more expressive, refined version of your message.",
      },
    ];
  }

  return NextResponse.json({ autoApprove: false, rewrites });
}
