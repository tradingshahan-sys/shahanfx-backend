export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only POST
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    // Check API key
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY لە Vercel Environment Variables دانەنراوە."
      });
    }

    // Check body
    const message =
      typeof req.body?.message === "string"
        ? req.body.message.trim()
        : "";

    if (!message) {
      return res.status(400).json({
        error: "هیچ message ـێک نەنێردراوە."
      });
    }

    // Gemini API
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent";

    const apiRes = await fetch(url, {
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
                text: message
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      })
    });

    const data = await apiRes.json();

    // Gemini returned an error
    if (!apiRes.ok) {
      console.error("Gemini API Error:", data);

      return res.status(apiRes.status).json({
        error: "Gemini API Error",
        details: data
      });
    }

    // Extract answer safely
    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!reply) {
      console.error("Unexpected Gemini response:", data);

      return res.status(502).json({
        error: "Gemini وەڵامێکی دروستی نەگەڕاندەوە.",
        details: data
      });
    }

    return res.status(200).json({
      reply
    });

  } catch (error) {
    console.error("Server Error:", error);

    return res.status(500).json({
      error: "هەڵەیەک لە سێرڤەر ڕوویدا.",
      details: error?.message || "Unknown error"
    });
  }
}
