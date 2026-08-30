export default async function handler(req, res) {
res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader(
"Access-Control-Allow-Methods",
"GET, POST, OPTIONS"
);
res.setHeader(
"Access-Control-Allow-Headers",
"Content-Type, Authorization"
);

if (req.method === "OPTIONS") {
return res.status(204).end();
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

const systemPrompt = `
```

تۆ ShahanFX AI Advisor ـیت.

بە کوردی سۆرانی وەڵام بدە.

ئەرکت یارمەتیدانی بەکارهێنەر لە Forex و Trading ـە.

لە شیکردنەوەدا ئەمانە بپشکنە:

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

ئەگەر Chart ـێک بۆت نێردرا:

* وێنەکە بە وردی بخوێنەوە.
* Symbol و Timeframe ئەگەر دیار بوو بناسە.
* Trend و Market Structure دیاری بکە.
* Liquidity و FVG بپشکنە.
* Support/Resistance بپشکنە.
* setup ـی ڕوون نەبوو، Buy/Sell بە زۆر مەدەرەوە.
* هیچ کاتێک دڵنیایی 100% مەدە.
* قازانجی دڵنیایی مەبەخشە.
* Risk Management لەبەرچاو بگرە.

ئەنجام بە شێوەی ڕوون و کورت بنووسە:

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
`;

```
const parts = [
  {
    text:
      systemPrompt +
      "\n\nUser Message:\n" +
      message
  }
];

if (image) {
  let imageData = image;
  let mimeType = "image/jpeg";

  if (imageData.startsWith("data:")) {
    const commaIndex =
      imageData.indexOf(",");

    if (commaIndex !== -1) {
      const header =
        imageData.substring(
          0,
          commaIndex
        );

      imageData =
        imageData.substring(
          commaIndex + 1
        );

      const match =
        header.match(
          /^data:(.*?);base64/
        );

      if (match) {
        mimeType = match[1];
      }
    }
  }

  parts.push({
    inline_data: {
      mime_type: mimeType,
      data: imageData
    }
  });
}

const geminiResponse =
  await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
        "x-goog-api-key":
          apiKey
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

const data =
  await geminiResponse.json();

if (!geminiResponse.ok) {

  console.error(
    "Gemini Error:",
    data
  );

  const errorText =
    data?.error?.message ||
    "Gemini API Error";

  if (
    geminiResponse.status === 429 ||
    errorText
      .toLowerCase()
      .includes("quota") ||
    errorText
      .toLowerCase()
      .includes("rate")
  ) {

    return res.status(429).json({
      success: false,
      error:
        "⏳ سنووری Gemini بۆ ئێستا پڕ بووە. تکایە کەمێک دواتر دووبارە هەوڵ بدە."
    });
  }

  return res
    .status(geminiResponse.status)
    .json({
      success: false,
      error: errorText
    });
}

const answer =
  data?.candidates?.[0]
    ?.content?.parts
    ?.map(
      part => part?.text || ""
    )
    .join("")
    .trim();

if (!answer) {
  return res.status(500).json({
    success: false,
    error:
      "Gemini هیچ وەڵامێکی نەدا."
  });
}

return res.status(200).json({
  success: true,
  answer: answer
});
```

} catch (error) {

```
console.error(
  "Backend Error:",
  error
);

return res.status(500).json({
  success: false,
  error:
    "هەڵەیەکی ناوخۆیی لە Backend ڕوویدا."
});
```

}
}
