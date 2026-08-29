export default async function handler(req, res) {
  // CORS
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

    const message = body?.message;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "message پێویستە"
      });
    }

    const systemPrompt = `
تۆ ShahanFX AI Advisor ـیت.

ئەرکی تۆ:
- یارمەتیدانی بەکارهێنەر لە بابەتی Trading و Forex.
- شیکردنەوەی زانیارییەکانی بەکارهێنەر بە شێوەی ڕوون.
- ئەگەر زانیاریی بازاڕ نەدرابێت، داوای زانیاریی پێویست بکە.
- هیچ دڵنیاییەکی 100% لە Buy/Sell مەدە.
- هەمیشە Risk Management لەبەرچاو بگرە.
- وەڵامەکانت بە کوردیی سۆرانی بنووسە، مەگەر بەکارهێنەر زمانی تر داوا بکات.
- کورت، ڕوون و زیرەک وەڵام بدە.
- ئەگەر شیکاری Trading داواکرا، ئەم خاڵانە جیا بکەرەوە:
  Trend
  Support/Resistance
  Liquidity
  FVG
  Market Structure
  Entry
  Stop Loss
  Take Profit
  Risk
  Confidence
`;

    const prompt = `${systemPrompt}

پرسیاری بەکارهێنەر:
${message}
`;

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
          input: prompt
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini Error:", data);

      return res.status(response.status).json({
        success: false,
        error: data?.error?.message || "هەڵە لە Gemini API"
      });
    }

    let answer = "";

    if (data.output_text) {
      answer = data.output_text;
    } else if (Array.isArray(data.output)) {
      answer = data.output
        .map(item => {
          if (typeof item === "string") return item;

          if (Array.isArray(item?.content)) {
            return item.content
              .map(x => x?.text || "")
              .join("");
          }

          return item?.text || "";
        })
        .join("\n");
    }

    if (!answer) {
      answer = "هیچ وەڵامێک لە Gemini وەرنەگیرا.";
    }

    return res.status(200).json({
      success: true,
      answer
    });

  } catch (error) {
    console.error("Server Error:", error);

    return res.status(500).json({
      success: false,
      error: "هەڵەیەکی ناوخۆیی ڕوویدا"
    });
  }
}
