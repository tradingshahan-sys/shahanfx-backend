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
const body =
typeof req.body === "string"
? JSON.parse(req.body)
: req.body || {};

```
const message = String(body.message || "").trim();

if (!message) {
  return res.status(400).json({
    success: false,
    error: "نامەکە بەتاڵە."
  });
}

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  return res.status(500).json({
    success: false,
    error: "GEMINI_API_KEY نەدۆزرایەوە لە Vercel."
  });
}

const model = "gemini-3.7-flash";

const url =
  "https://generativelanguage.googleapis.com/v1beta/models/" +
  model +
  ":generateContent?key=" +
  encodeURIComponent(apiKey);

const googleResponse = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    contents: [
      {
        parts: [
          {
            text:
              "تۆ ShahanFX AI Advisor ـیت.\n" +
              "بە کوردیی سۆرانی وەڵام بدەرەوە.\n\n" +
              "پرسیاری بەکارهێنەر:\n" +
              message
          }
        ]
      }
    ]
  })
});

const raw = await googleResponse.text();

let data;

try {
  data = JSON.parse(raw);
} catch {
  return res.status(502).json({
    success: false,
    error: "وەڵامی Google JSON نییە.",
    status: googleResponse.status,
    raw: raw.substring(0, 500)
  });
}

if (!googleResponse.ok) {
  return res.status(googleResponse.status).json({
    success: false,
    error:
      data?.error?.message ||
      "Gemini API هەڵەیەکی نەناسراوی گەڕاندەوە.",
    status: googleResponse.status
  });
}

const answer =
  data?.candidates?.[0]?.content?.parts?.[0]?.text;

if (!answer || !String(answer).trim()) {
  return res.status(500).json({
    success: false,
    error: "Gemini وەڵامی بەتاڵی گەڕاندەوە.",
    finishReason:
      data?.candidates?.[0]?.finishReason || null
  });
}

return res.status(200).json({
  success: true,
  answer: String(answer).trim(),
  model: model
});
```

} catch (error) {
return res.status(500).json({
success: false,
error:
error instanceof Error
? error.message
: String(error)
});
}
}
