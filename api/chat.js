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
const message = String(body.message || "").trim();

```
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

const response = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=" +
  encodeURIComponent(apiKey),
  {
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
                "بە کوردیی سۆرانی وەڵام بدەرەوە.\n\n" +
                "پرسیار:\n" +
                message
            }
          ]
        }
      ]
    })
  }
);

const data = await response.json();

if (!response.ok) {
  return res.status(response.status).json({
    success: false,
    error:
      data?.error?.message ||
      "هەڵە لە Gemini API"
  });
}

const answer =
  data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

if (!answer.trim()) {
  return res.status(500).json({
    success: false,
    error: "Gemini وەڵامی AI ـی بەتاڵی گەڕاندەوە.",
    googleResponse: data
  });
}

return res.status(200).json({
  success: true,
  answer: answer.trim()
});
```

} catch (error) {
return res.status(500).json({
success: false,
error: error instanceof Error
? error.message
: String(error)
});
}
}
