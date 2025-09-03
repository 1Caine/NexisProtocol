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
Always respond in **valid JSON** with the following structure:

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
      "development": "...",
      "marketing": "...",
      "partnerships": "...",
      "community_incentives": "...",
      "reserve": "..."
    },
    "growth_strategy": {
      "short_term": "...",
      "long_term": "...",
      "channels": "...",
      "content_plan": "..."
    }
  },
  "next_actions": [
    "...",
    "...",
    "..."
  ],
  "open_questions": [
    "...",
    "...",
    "..."
  ]
}

Rules:
- Always provide **specific and detailed numbers/percentages** for budget allocation.
- Be practical and realistic with crypto/Web3 projects.
- If information is missing, make reasonable assumptions and state them.
- No extra text outside JSON.

If the project involves tokens or coins, also include a 'tokenomics' section.

For tokenomics, provide:
- supply_design (describe total supply, inflation/deflation rules)
- distribution_strategy (how tokens are allocated: team, treasury, community, investors, etc.)
- vesting_and_unlocks (cliff, schedule, % unlocked at TGE, etc.)
- utility (how the token is used: governance, staking, access, payments, burns, rewards)
- capital_allocation (how funds raised or treasury are spent: dev, marketing, ops, liquidity, reserves)

If no token is involved, omit the tokenomics section completely.
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

