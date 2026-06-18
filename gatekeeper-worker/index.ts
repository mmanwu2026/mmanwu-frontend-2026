import { createClient } from "@supabase/supabase-js";

// ------------------------------
//  Supabase + API Key Setup
// ------------------------------
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const apiKey = process.env.OPENAI_API_KEY!;

// ------------------------------
//  generateRewrites Function
//  (paste your full rewrite logic here)
// ------------------------------
async function generateRewrites(input: string, apiKey: string) {
  // 👉 Your entire rewrite logic goes here
  // (the same function you copied from your Gatekeeper route)
}



// ------------------------------
//  Gatekeeper Worker Loop
// ------------------------------
async function runWorker() {
  console.log("Gatekeeper Worker started...");

  while (true) {
    // 1️⃣ Get next pending job
    const { data: job, error: jobError } = await supabase
      .from("gatekeeper_jobs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (jobError || !job) {
      await sleep(2000);
      continue;
    }

    console.log("Processing job:", job.id);

    // Mark job as processing
    await supabase
      .from("gatekeeper_jobs")
      .update({ status: "processing" })
      .eq("id", job.id);

    // 2️⃣ Fetch the post
    const { data: post } = await supabase
      .from("posts")
      .select("*")
      .eq("id", job.post_id)
      .single();

    if (!post) {
      console.log("Post not found, skipping job");
      await supabase
        .from("gatekeeper_jobs")
        .update({ status: "done" })
        .eq("id", job.id);
      continue;
    }

    const text = post.content;

    // ------------------------------
    //  Emotion Analysis
    // ------------------------------
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

    // 3️⃣ Generate rewrites
    const rewrites = await generateRewrites(text, apiKey);

    // 4️⃣ Update the post with results
    await supabase
      .from("posts")
      .update({
        emotion: analysis.emotion,
        toxicity: analysis.toxicity,
        bullying: analysis.bullying,
        clarity: analysis.clarity,
        rewrites,
        status: "processed",
      })
      .eq("id", post.id);

    // 5️⃣ Mark job as done
    await supabase
      .from("gatekeeper_jobs")
      .update({ status: "done" })
      .eq("id", job.id);

    console.log("Job completed:", job.id);
  }
}



// ------------------------------
//  Sleep Helper
// ------------------------------
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}



// ------------------------------
//  Start the Worker
// ------------------------------
runWorker();
