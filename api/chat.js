export default async function handler(req, res) {
  // =========================
  // CORS
  // =========================
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

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
    // =========================
    // GEMINI KEY
    // =========================
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "GEMINI_API_KEY لە Vercel دانەنراوە"
      });
    }

    // =========================
    // BODY
    // =========================
    let body = req.body;

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({
          success: false,
          error: "JSON ـەکە دروست نییە"
        });
      }
    }

    const message =
      typeof body?.message === "string"
        ? body.message.trim()
        : "";

    const image =
      typeof body?.image === "string"
        ? body.image
        : null;

    if (!message && !image) {
      return res.status(400).json({
        success: false,
        error: "پەیام یان وێنە پێویستە"
      });
    }

    // =========================
    // SHAHANFX AI
    // =========================
    const systemInstruction = `
تۆ ShahanFX AI Advisor ـیت.

وەڵامەکانت بە کوردی سۆرانی بنووسە.

ئەرکی تۆ:
- یارمەتیدانی بەکارهێنەر لە Forex و Trading
- شیکردنەوەی Chart
- ڕوونکردنەوەی Market Structure
- Trend
- Support / Resistance
- Liquidity
- FVG
- Candlestick
- Entry
- Stop Loss
- Take Profit
- Risk/Reward
- Confidence
- Risk Level

ئەگەر وێنەی Chart نێردرا:
1. Symbol ئەگەر دیارە بناسە.
2. Timeframe ئەگەر دیارە بناسە.
3. Trend دیاری بکە.
4. Market Structure شیکەرەوە.
5. Liquidity بپشکنە.
6. FVG بپشکنە.
7. Support و Resistance بپشکنە.
8. Candlestick ـە گرنگەکان بپشکنە.
9. Setup ـی هەبوو دیاری بکە.
10. Entry / SL / TP پێشنیار بکە ئەگەر زانیارییەکان بەس بوون.

ئەگەر setup ـێکی ڕوون نییە:
Buy یان Sell بە زۆر مەدەرەوە.

هیچ کاتێک دڵنیایی 100% مەدە.
قازانجی دڵنیایی بەڵێن مەدە.
Risk Management هەمیشە لەبەرچاو بگرە.

ئەگەر setup ـەکە ڕوون بوو، ئەم شێوەیە بەکاربهێنە:

📊 SHAHANFX ANALYSIS

Market:
Timeframe:
Trend:
Market Structure:
Liquidity:
FVG:
Support/Resistance:
Candlestick:

🎯 SETUP

Direction:
Entry:
Stop Loss:
Take Profit 1:
Take Profit 2:
Risk/Reward:

📈 Confidence:
⚠️ Risk:

کورت، ڕوون و پیشەیی وەڵام بدە.
`;

    // =========================
    // INPUT
    // =========================
    let input = message;

    // =========================
    // IMAGE
    // =========================
    if (image) {
      input += `

وێنەی Chart لەگەڵ ئەم پرسیارە نێردراوە.
تکایە وێنەکە بە وردی شیکەرەوە.
`;
    }

    // =========================
    // GEMINI REQUEST
    // =========================
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

          system_instruction:
            systemInstruction,

          input: input
        })
      }
    );

    const data = await response.json();

    // =========================
    // GEMINI ERROR
    // =========================
    if (!response.ok) {
      console.error(
        "Gemini Error:",
        data
      );

      const errorMessage =
        data?.error?.message ||
        "Gemini API Error";

      if (
        response.status === 429 ||
        errorMessage
          .toLowerCase()
          .includes("quota") ||
        errorMessage
          .toLowerCase()
          .includes("rate")
      ) {
        return res.status(429).json({
          success: false,
          error:
            "⏳ سنووری Gemini بۆ ئێستا پڕ بووە. تکایە کەمێک دواتر دووبارە هەوڵ بدە."
        });
      }

      return res.status(response.status).json({
        success: false,
        error: errorMessage
      });
    }

    // =========================
    // ANSWER
    // =========================
    const answer =
      data?.output_text ||
      data?.output
        ?.map(item => {
          if (typeof item === "string") {
            return item;
          }

          if (Array.isArray(item?.content)) {
            return item.content
              .map(x => x?.text || "")
              .join("");
          }

          return item?.text || "";
        })
        .join("\n")
        .trim();

    if (!answer) {
      return res.status(500).json({
        success: false,
        error:
          "Gemini هیچ وەڵامێکی نەدا."
      });
    }

    // =========================
    // SUCCESS
    // =========================
    return res.status(200).json({
      success: true,
      answer: answer
    });

  } catch (error) {
    console.error(
      "ShahanFX Server Error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error?.message ||
        "هەڵەیەکی ناوخۆیی ڕوویدا."
    });
  }
}
