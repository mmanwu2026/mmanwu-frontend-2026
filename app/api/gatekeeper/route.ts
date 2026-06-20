import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  // ⭐ FIX: Create client INSIDE handler so it does NOT run at build time
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  try {
    const { text } = await req.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing text" },
        { status: 400 }
      );
    }

    // 1️⃣ Detect celebratory / positive posts
    const detect = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a classifier. Determine if the text is celebratory, grateful, proud, joyful, or uplifting. Respond ONLY with 'YES' or 'NO'.",
        },
        { role: "user", content: text },
      ],
      max_tokens: 2,
    });

    const isPositive =
      detect.choices[0].message.content?.trim().toUpperCase() === "YES";

    if (isPositive) {
      return NextResponse.json({
        autoApprove: true,
        reason: "Celebratory or positive content",
      });
    }

    // 2️⃣ Generate rewrite suggestions (STRICT JSON SCHEMA)
    const rewrite = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Rewrite the user's text in 3 different creative ways. Return ONLY valid JSON.",
        },
        { role: "user", content: text },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "rewrites_schema",
          schema: {
            type: "object",
            properties: {
              rewrites: {
                type: "array",
                items: { type: "string" },
                minItems: 3,
                maxItems: 3,
              },
            },
            required: ["rewrites"],
            additionalProperties: false,
          },
        },
      },
      max_tokens: 300,
    });

    const raw = rewrite.choices?.[0]?.message?.content ?? "{}";

    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("JSON parse error:", e, "RAW:", raw);
      parsed = { rewrites: [] };
    }

    if (!parsed.rewrites || parsed.rewrites.length !== 3) {
      console.error("Gatekeeper rewrite schema mismatch:", parsed);
      return NextResponse.json({
        autoApprove: false,
        rewrites: [
          "Rewrite unavailable (1)",
          "Rewrite unavailable (2)",
          "Rewrite unavailable (3)",
        ],
      });
    }

    return NextResponse.json({
      autoApprove: false,
      rewrites: parsed.rewrites,
    });

  } catch (err) {
    console.error("Gatekeeper error:", err);
    return NextResponse.json(
      { error: "Gatekeeper processing failed" },
      { status: 500 }
    );
  }
}
