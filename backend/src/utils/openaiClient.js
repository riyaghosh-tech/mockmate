const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

async function askAI(prompt) {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes("sk-...")) {
    throw new Error("OPENAI_API_KEY is missing or invalid");
  }

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4
  });

  return (response.choices[0].message.content || "").trim();
}

function parseJSON(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) return fallback;
    try {
      return JSON.parse(match[0]);
    } catch {
      return fallback;
    }
  }
}

module.exports = { askAI, parseJSON };
