import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { text } = await req.json();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

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
You are the Mmanwu Emotional Classifier.

Analyze the user's message and return a JSON object with:
- emotion: one of ["joy","excitement","gratitude","pride","relief","celebration","anger","sadness","fear","anxiety","neutral"]
- intensity: number 0–1
- toxicity: number 0–1
- bullying: number 0–1
- clarity: number 0–1
Return ONLY valid JSON.
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
Rewrite the user's message into 3 versions:
1. Calm
2. Direct
3. Elevated

Return JSON:
[
  { "label": "Calm", "text": "...", "explanation": "..." },
  { "label": "Direct", "text": "...", "explanation": "..." },
  { "label": "Elevated", "text": "...", "explanation": "..." }
]
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
    rewrites = JSON.parse(rewriteJson?.choices?.[0]?.message?.content || "[]");
  } catch {
    rewrites = [];
  }

  return NextResponse.json({ autoApprove: false, rewrites });
}
