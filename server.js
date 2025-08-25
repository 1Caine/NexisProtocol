// server.js
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

app.post("/nexis", async (req, res) => {
  const { idea, audience, budget, timeline, goal } = req.body;

  const systemPrompt = `
You are Nexis, a pragmatic builder’s copilot that turns an idea into a shipped project.
Always respond in valid JSON with the following structure:

{
  "executive_snapshot": {
    "goal": "...",
    "constraints": "...",
    "success_metric": "...",
    "assumptions": "..."
  },
  "next_actions": ["...", "...", "..."],
  "open_questions": ["...", "...", "..."]
}
No explanations, no extra text.
`;

  const userPrompt = `
Idea: ${idea}
Audience: ${audience || "Not specified"}
Budget: ${budget || "Not specified"}
Timeline: ${timeline || "Not specified"}
Goal (30 days): ${goal || "Not specified"}
`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3
      }),
    });

    const data = await response.json();
    const rawOutput = data.choices?.[0]?.message?.content || "{}";

    let parsedOutput;
    try {
      parsedOutput = JSON.parse(rawOutput);
    } catch {
      parsedOutput = { raw: rawOutput };
    }

    res.json(parsedOutput);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate Nexis output." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Nexis backend running on http://localhost:${PORT}`);
});
