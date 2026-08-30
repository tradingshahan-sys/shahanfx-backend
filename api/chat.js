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
    error: "GEMINI_API_KEY نەدۆزرایەوە"
  });
}

const body =
  typeof req.body === "string"
    ? JSON.parse(req.body)
    : req.body || {};

const message =
  String(body.message || "").trim();

if (!message) {
  return res.status(400).json({
    success: false,
    error: "نامەکە بەتاڵە"
  });
}

const url =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=" +
  encodeURIComponent(apiKey);

const response = await fetch(url, {
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
              "بە کوردی سۆرانی وەڵام بدەرەوە.\n\n" +
              message
          }
        ]
      }
    ]
  })
});

const raw = await response.text();

return res.status(response.status).json({
  success: response.ok,
  googleStatus: response.status,
  raw: raw
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
