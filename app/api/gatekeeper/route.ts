import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
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

    // 2️⃣ Generate rewrite suggestions
    const rewrite = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Rewrite the user's text in 3 different emotional tones: Calm, Confident, and Playful. Keep meaning intact. Return ONLY the rewrites.",
        },
        { role: "user", content: text },
      ],
      max_tokens: 200,
    });

    const raw = rewrite.choices[0].message.content || "";
    const options = raw
  .split("\n")
  .map((line: string) => line.trim())
  .filter((line: string) => line.length > 0);

    return NextResponse.json({
      autoApprove: false,
      rewrites: options,
    });
  } catch (err) {
    console.error("Gatekeeper error:", err);
    return NextResponse.json(
      { error: "Gatekeeper processing failed" },
      { status: 500 }
    );
  }
}
