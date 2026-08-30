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
let body = req.body;

```
if (typeof body === "string") {
  body = JSON.parse(body);
}

const message = body?.message?.trim();

if (!message) {
  return res.status(400).json({
    success: false,
    error: "هیچ پرسیارێک نەنێردراوە."
  });
}

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  return res.status(500).json({
    success: false,
    error: "GEMINI_API_KEY لە Vercel نەدۆزرایەوە."
  });
}

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
            text:
              "تۆ ShahanFX AI Advisor ـیت. " +
              "بە کوردیی سۆرانی وەڵامی بەکارهێنەر بدەرەوە. " +
              "وەڵامەکەت ڕوون و بەسوود بێت.\n\n" +
              "پرسیاری بەکارهێنەر:\n" +
              message
          }
        ]
      }
    ]
  })
});

const raw = await apiRes.text();

let data;

try {
  data = JSON.parse(raw);
} catch {
  return res.status(502).json({
    success: false,
    error: "وەڵامی نادروست لە Gemini API.",
    status: apiRes.status,
    raw: raw.substring(0, 500)
  });
}

if (!apiRes.ok) {
  return res.status(apiRes.status).json({
    success: false,
    error:
      data?.error?.message ||
      "Gemini API هەڵەیەکی نەناسراوی گەڕاندەوە.",
    status: apiRes.status
  });
}

const answer =
  data?.candidates?.[0]?.content?.parts
    ?.map(part => part.text || "")
    .join("")
    .trim();

if (!answer) {
  return res.status(500).json({
    success: false,
    error: "Gemini هیچ وەڵامێکی نەگەڕاندەوە.",
    debug: data
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
error: "Backend Error: " + error.message
});
}
}
