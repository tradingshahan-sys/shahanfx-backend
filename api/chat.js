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
        error: "GEMINI_API_KEY لە Vercel نەدۆزرایەوە"
      });
    }

    let body = req.body;

    if (typeof body === "string") {
      body = JSON.parse(body);
    }

    const message =
      typeof body?.message === "string"
        ? body.message.trim()
        : "";

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "message پێویستە"
      });
    }

    const prompt = `
تۆ ShahanFX AI Advisor ـیت.

وەڵامەکانت بە کوردی سۆرانی بنووسە.

لە Forex و Trading یارمەتی بەکارهێنەر بدە.

Trend
Market Structure
Support / Resistance
Liquidity
FVG
Candlestick
Entry
Stop Loss
Take Profit
Risk/Reward
Confidence
Risk Level

هیچ کاتێک دڵنیایی 100% لە Buy یان Sell مەدە.
Risk Management لەبەرچاو بگرە.

پرسیاری بەکارهێنەر:
${message}
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1500
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error:
          data?.error?.message ||
          "Gemini API Error"
      });
    }

    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!answer) {
      return res.status(500).json({
        success: false,
        error: "Gemini هیچ وەڵامێکی نەدا."
      });
    }

    return res.status(200).json({
      success: true,
      answer: answer
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message || "Server Error"
    });
  }
}
