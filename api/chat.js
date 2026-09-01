export default async function handler(req, res) {
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

    const parts = [
      {
        text: `
تۆ ShahanFX AI ـیت.

بە کوردی سۆرانی وەڵام بدە.

بواری شارەزاییت:
Forex، ICT، SMC، Market Structure، BOS، CHOCH،
FVG، Order Block، Liquidity، Liquidity Sweep،
Premium، Discount، Fibonacci، Risk Management.

ڕێنمایی:
- وەڵامەکان ڕوون و بەسوود بن.
- بۆ هیچ trade ـێک دڵنیایی 100% مەدە.
- ئەگەر chart هەیە، تەنها ئەو شتانە شیکاربکە کە لە chart ـەکەدا دەبینرێن.
- Risk Management لەبەرچاو بگرە.
- ئەگەر زانیاری کەمە، بڵێ زانیاری زیاتر پێویستە.

پرسیاری بەکارهێنەر:
${message || "ئەم chart ـە شیکاربکە."}
`
      }
    ];

    if (image?.data && image?.mimeType) {
      parts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data
        }
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" +
        encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: parts
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
      console.error("Gemini API Error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "هەڵەیەک لە Gemini API ڕوویدا"
      });
    }

    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("") ||
      "وەڵامێک نەدۆزرایەوە.";

    return res.status(200).json({
      success: true,
      answer: answer
    });

  } catch (error) {
    console.error("Server Error:", error);

    return res.status(500).json({
      error: "هەڵەی ناوخۆی Backend ڕوویدا."
    });
  }
}
