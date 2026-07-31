export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
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

    // 1️⃣ Harm Detection
    const detect = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a safety classifier. Determine ONLY whether the text contains harmful content such as harassment, bullying, hate, violence, threats, sexual exploitation, or malicious intent. Respond ONLY with 'YES' if harmful, or 'NO' if safe.",
        },
        { role: "user", content: text },
      ],
      max_tokens: 2,
    });

    const isHarmful =
      detect.choices[0].message.content?.trim().toUpperCase() === "YES";

    if (!isHarmful) {
      return NextResponse.json({
        autoApprove: true,
        reason: "Safe content (no harm detected)",
      });
    }

    // 3️⃣ If HARMFUL → rewrite
    const rewrite = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Rewrite the user's text in 3 different creative ways that remove harmful content while preserving the user's intended meaning. Return ONLY valid JSON.",
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
