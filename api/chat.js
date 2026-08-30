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
const body = req.body || {};

```
const message =
  typeof body.message === "string"
    ? body.message.trim()
    : "";

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
    error: "GEMINI_API_KEY لە Vercel نەدۆزرایەوە."
  });
}

const apiUrl =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
  encodeURIComponent(apiKey);

const googleResponse = await fetch(apiUrl, {
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
              "تۆ ShahanFX AI Advisor ـیت. " +
              "بە کوردیی سۆرانی وەڵام بدەرەوە. " +
              "وەڵامەکەت ڕوون و بەسوود بێت.\n\n" +
              message
          }
        ]
      }
    ]
  })
});

const data = await googleResponse.json();

if (!googleResponse.ok) {
  return res.status(googleResponse.status).json({
    success: false,
    error:
      data?.error?.message ||
      "هەڵە لە Gemini API"
  });
}

const parts =
  data?.candidates?.[0]?.content?.parts || [];

const answer = parts
  .map(function (part) {
    return part && typeof part.text === "string"
      ? part.text
      : "";
  })
  .join("")
  .trim();

if (!answer) {
  return res.status(500).json({
    success: false,
    error: "Gemini وەڵامی بەتاڵی گەڕاندەوە."
  });
}

return res.status(200).json({
  success: true,
  answer: answer
});
```

} catch (error) {
return res.status(500).json({
success: false,
error:
"Backend Error: " +
(error && error.message
? error.message
: String(error))
});
}
}
