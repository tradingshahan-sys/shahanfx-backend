export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "تەنها POST ڕێگەپێدراوە"
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "GEMINI_API_KEY لە Vercel دانەنراوە"
      });
    }

    const message = req.body?.message;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "message پێویستە"
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          model: "gemini-3.7-flash",
          system_instruction: `
تۆ ShahanFX AI Advisor ـیت.

وەڵامەکان بە کوردی سۆرانی بنووسە.
لە بابەتی Forex و Trading یارمەتی بەکارهێنەر بدە.
Risk Management لەبەرچاو بگرە.
هیچ دڵنیاییەکی 100% لە Buy یا Sell مەدە.
ئەگەر زانیاریی بازاڕ کەم بوو، داوای زانیاریی پێویست بکە.
`,
          input: message
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data?.error?.message || "Gemini API Error"
      });
    }

    return res.status(200).json({
      success: true,
      answer: data.output_text || "وەڵامێک نەدۆزرایەوە."
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Server Error"
    });
  }
}
