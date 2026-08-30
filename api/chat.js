export default async function handler(req, res) {
try {
res.setHeader(
"Access-Control-Allow-Origin",
"*"
);

```
res.setHeader(
  "Access-Control-Allow-Methods",
  "GET, POST, OPTIONS"
);

res.setHeader(
  "Access-Control-Allow-Headers",
  "Content-Type"
);

// OPTIONS
if (req.method === "OPTIONS") {
  return res.status(200).end();
}

// GET - تاقیکردنەوە
if (req.method === "GET") {
  return res.status(200).json({
    success: true,
    answer: "GET_OK"
  });
}

// تەنها POST
if (req.method !== "POST") {
  return res.status(405).json({
    success: false,
    error: "تەنها POST ڕێگەپێدراوە"
  });
}

// وەرگرتنی Body
let body = req.body;

if (typeof body === "string") {
  body = JSON.parse(body);
}

body = body || {};

const message =
  String(body.message || "").trim();

if (!message) {
  return res.status(400).json({
    success: false,
    error: "نامەکە بەتاڵە."
  });
}

// Gemini API Key
const apiKey =
  process.env.GEMINI_API_KEY;

if (!apiKey) {
  return res.status(500).json({
    success: false,
    error:
      "GEMINI_API_KEY لە Vercel نەدۆزرایەوە."
  });
}

// Gemini model
const model =
  "gemini-3.7-flash";

const url =
  "https://generativelanguage.googleapis.com/v1beta/models/" +
  model +
  ":generateContent?key=" +
  encodeURIComponent(apiKey);

// ناردن بۆ Gemini
const googleResponse =
  await fetch(url, {
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

// وەرگرتنی وەڵامی Google
const raw =
  await googleResponse.text();

let data;

try {
  data = JSON.parse(raw);
} catch (parseError) {
  return res.status(502).json({
    success: false,
    error:
      "Gemini وەڵامی JSON ـی نەدا.",
    raw: raw.substring(0, 1000)
  });
}

// هەڵەی Gemini
if (!googleResponse.ok) {
  return res.status(
    googleResponse.status
  ).json({
    success: false,
    error:
      data?.error?.message ||
      "Gemini API Error",
    googleStatus:
      googleResponse.status
  });
}

// دەرهێنانی وەڵام
const answer =
  data?.candidates?.[0]
    ?.content?.parts?.[0]
    ?.text;

if (!answer) {
  return res.status(500).json({
    success: false,
    error:
      "Gemini وەڵامی بەتاڵی گەڕاندەوە.",
    googleResponse: data
  });
}

// وەڵامی سەرکەوتوو
return res.status(200).json({
  success: true,
  answer: String(answer).trim()
});
```

} catch (error) {

```
console.error(
  "ShahanFX Backend Error:",
  error
);

return res.status(500).json({
  success: false,
  error:
    error instanceof Error
      ? error.message
      : String(error)
});
```

}
}
