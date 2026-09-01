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
      error: "تەنها POST ڕێگەپێدراوە"
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY لە Vercel دانەنراوە"
      });
    }

    const { message, image } = req.body || {};

    if (!message && !image) {
      return res.status(400).json({
        error: "نامە یان وێنە بنێرە"
      });
    }

    const prompt = `
تۆ ShahanFX AI ـیت.

زمانی سەرەکی:
کوردی سۆرانی

بواری شارەزایی:
- Forex
- ICT
- SMC
- Liquidity
- Market Structure
- BOS
- CHOCH
- FVG
- Order Block
- Breaker Block
- Liquidity Sweep
- Premium / Discount
- Fibonacci
- Risk Management
- Trading Psychology

ڕێنمایی گرنگ:
1. بە کوردی سۆرانی وەڵام بدە.
2. وەڵامەکان ڕوون و کورت و بەسوود بن.
3. ئەگەر chart ـێک نێردرا، تەنها لەسەر ئەو شتانە قسە بکە کە لە وێنەکەدا بە ڕوونی دەبینرێن.
4. هیچ دڵنیاییەکی 100% بۆ بردن یان direction مەدە.
5. ئەگەر زانیارییەکان تەواو نەبن، بە ڕوونی بڵێ کە پێویستی بە زانیاری زیاترە.
6. Risk Management هەمیشە گرنگە.
7. ئەمە ڕاوێژی دارایی تایبەتی نییە.

پرسیاری بەکارهێنەر:
${message || "تکایە ئەم chart ـە شیکاربکە."}
`;

    const parts = [
      {
        text: prompt
      }
    ];

    // ئەگەر وێنە هەبێت
    if (image && image.data && image.mimeType) {
      parts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data
        }
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts
            }
          ],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 1500
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini Error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "هەڵەیەک لە Gemini API ڕوویدا"
      });
    }

    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("") || "وەڵامێک نەدۆزرایەوە.";

    return res.status(200).json({
      success: true,
      answer
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "هەڵەی ناوخۆی Backend ڕوویدا."
    });
  }
}
