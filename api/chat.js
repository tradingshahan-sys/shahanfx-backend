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

```
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

const message = body?.message || "";
const image = body?.image || null;

if (!message && !image) {
  return res.status(400).json({
    success: false,
    error: "پەیام یان وێنە پێویستە"
  });
}

const systemPrompt = `
```

تۆ ShahanFX AI Advisor ـیت.

ئەرکت شیکردنەوەی Forex و Trading ـە.

هەمیشە بە کوردی سۆرانی وەڵام بدە، مەگەر بەکارهێنەر زمانی تر داوا بکات.

لە شیکردنەوەی Chart ئەمانە بپشکنە:

1. Trend
2. Market Structure
3. Support / Resistance
4. Liquidity
5. FVG
6. Candlestick
7. Entry Zone
8. Stop Loss
9. Take Profit
10. Risk/Reward
11. Confidence
12. Risk Level

ئەگەر وێنەی Chart هەیە:

* Chart ـەکە بە وردی بخوێنەوە.
* Symbol ئەگەر دیارە بناسە.
* Timeframe ئەگەر دیارە بناسە.
* Trend دیاری بکە.
* Market Structure شیکەرەوە.
* Liquidity و FVG بپشکنە.
* Support و Resistance دیاری بکە.
* Candlestick ـە گرنگەکان بپشکنە.
* ئەگەر setup ـێکی ڕوون نەبوو، Buy/Sell بە زۆر مەدەرەوە.
* هیچ کاتێک دڵنیایی 100% مەدە.
* هیچ قازانجێکی دڵنیایی مەبەخشە.
* Risk Management هەمیشە لەبەرچاو بگرە.

ئەگەر setup ـێکی باش هەبوو، ئەنجامەکە بە ئەم شێوەیە ڕێک بخە:

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

کورت، ڕوون، پیشەیی و ڕاستگۆ وەڵام بدە.
`;

```
const parts = [
  {
    text: systemPrompt + "\n\nپرسیاری بەکارهێنەر:\n" + message
  }
];

if (image) {
  let imageData = image;
  let mimeType = "image/jpeg";

  if (imageData.includes(",")) {
    const header = imageData.split(",")[0];
    imageData = imageData.split(",")[1];

    const match = header.match(/data:(.*?);base64/);

    if (match) {
      mimeType = match[1];
    }
  }

  parts.push({
    inline_data: {
      mime_type: mimeType,
      data: imageData
    }
  });
}

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
          parts: parts
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
  console.error("Gemini Error:", data);

  const errorText =
    data?.error?.message ||
    "هەڵەیەک لە Gemini API ڕوویدا.";

  const lowerError = errorText.toLowerCase();

  if (
    response.status === 429 ||
    lowerError.includes("quota") ||
    lowerError.includes("rate limit") ||
    lowerError.includes("rate")
  ) {
    return res.status(429).json({
      success: false,
      error:
        "⏳ سنووری بەکارهێنانی Gemini بۆ ئێستا پڕ بووە. تکایە کەمێک دواتر دووبارە هەوڵ بدە."
    });
  }

  return res.status(response.status).json({
    success: false,
    error: errorText
  });
}

const answer =
  data?.candidates?.[0]?.content?.parts
    ?.map(part => part?.text || "")
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
```

} catch (error) {
console.error("Server Error:", error);

```
return res.status(500).json({
  success: false,
  error: "هەڵەیەکی ناوخۆیی ڕوویدا."
});
```

}
}
