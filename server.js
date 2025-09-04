// server.js
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_KEY = (process.env.GROQ_API_KEY || "").trim();
const GROQ_MODEL = (process.env.GROQ_MODEL || "llama-3.3-70b-versatile").trim();

app.use(cors());
app.use(bodyParser.json());

// Simple health check
app.get("/", (req, res) => {
  res.type("text/plain").send("Nexis backend is running.");
});

app.post("/nexis", async (req, res) => {
  const { idea, audience, budget, timeline, goal } = req.body;

  if (!GROQ_KEY) {
    return res.status(500).json({ error: "Missing GROQ_API_KEY on server." });
  }

  const systemPrompt = `
You are Nexis, a pragmatic builder’s copilot that turns an idea into a shipped project.
Return ONLY valid JSON (no backticks, no prose) with:

{
  "executive_snapshot": {
    "goal": "...",
    "constraints": "...",
    "success_metric": "...",
    "assumptions": "..."
  },
  "detailed_plan": {
    "tokenomics": {
      "supply_design": "...",
      "distribution_strategy": "...",
      "vesting_and_unlocks": "...",
      "utility": "..."
    },
    "budget_allocation": {
      "development": "…%",
      "marketing": "…%",
      "partnerships": "…%",
      "community_incentives": "…%",
      "reserve": "…%"
    },
    "growth_strategy": {
      "short_term": "...",
      "long_term": "...",
      "channels": "...",
      "content_plan": "..."
    }
  },
  "next_actions": ["...","...","..."],
  "open_questions": ["...","...","..."]
}
Rules:
- Use percentages for budget_allocation (numbers + %).
- Be practical and specific. If info is missing, make reasonable assumptions and state them.
- If the project is not token-based, OMIT the "tokenomics" object entirely.
- Output MUST be valid JSON with double quotes only. No markdown fences, no commentary.
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
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL, // 👈 updated model (configurable)
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3
      }),
    });

    const apiJSON = await response.json();

    if (!response.ok) {
      const status = response.status;
      console.error("Groq API error:", status, apiJSON);
      return res.status(status).json({
        error: "Groq API error",
        status,
        message: apiJSON?.error?.message || apiJSON?.message || "Unknown error",
        details: apiJSON
      });
    }

    // Model text content
    let raw = (apiJSON.choices?.[0]?.message?.content || "").trim();
    console.log("Groq raw content:", raw);

    // Strip ``` fences if present
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```json\s*/i, "")
               .replace(/^```\s*/i, "")
               .replace(/```$/i, "");
    }

    // Try to parse JSON
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Return raw so frontend shows something instead of "{}"
      return res.json({ raw });
    }

    // Optional: if tokenomics exists but every field says "Not applicable", drop it
    const tok = parsed?.detailed_plan?.tokenomics;
    if (tok && Object.values(tok).every(v => typeof v === "string" && /not applicable/i.test(v))) {
      delete parsed.detailed_plan.tokenomics;
    }

    return res.json(parsed);
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Failed to generate Nexis output." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Nexis backend running on port ${PORT}`);
});

