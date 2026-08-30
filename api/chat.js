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
    error: "GEMINI_API_KEY لە Vercel نەدۆزرایەوە."
  });
}

let body = req.body;

if (typeof body === "string") {
  body = JSON.parse(body);
}

const message =
  String(body?.message || "").trim();

if (!message) {
  return res.status(400).json({
    success: false,
    error: "نامەکە بەتاڵە."
  });
}

/*
  سەرەتا model ـە بەردەستەکان دەدۆزینەوە
*/

const modelsResponse = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/models?key=" +
  encodeURIComponent(apiKey)
);

const modelsRaw =
  await modelsResponse.text();

let modelsData;

try {
  modelsData = JSON.parse(modelsRaw);
} catch {
  return res.status(502).json({
    success: false,
    error: "Google وەڵامی JSON ـی نەدا.",
    raw: modelsRaw.substring(0, 1000)
  });
}

if (!modelsResponse.ok) {
  return res.status(modelsResponse.status).json({
    success: false,
    error:
      modelsData?.error?.message ||
      "نەتوانرا model ـەکان بخوێندرێنەوە."
  });
}

/*
  تەنها model ـەکانی generateContent
*/

const availableModel =
  modelsData?.models?.find(
    model =>
      Array.isArray(model.supportedGenerationMethods) &&
      model.supportedGenerationMethods.includes(
        "generateContent"
      )
  );

if (!availableModel) {
  return res.status(500).json({
    success: false,
    error:
      "هیچ Gemini model ـێک بە generateContent بەردەست نییە.",
    models: modelsData?.models || []
  });
}

const modelName =
  availableModel.name;

/*
  Generate Content
*/

const generateURL =
  "https://generativelanguage.googleapis.com/v1beta/" +
  modelName +
  ":generateContent?key=" +
  encodeURIComponent(apiKey);

const googleResponse =
  await fetch(generateURL, {
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

const raw =
  await googleResponse.text();

let data;

try {
  data = JSON.parse(raw);
} catch {
  return res.status(502).json({
    success: false,
    error: "Gemini وەڵامی JSON ـی نەدا.",
    raw: raw.substring(0, 1000)
  });
}

if (!googleResponse.ok) {
  return res.status(googleResponse.status).json({
    success: false,
    error:
      data?.error?.message ||
      "Gemini API Error",
    googleStatus:
      googleResponse.status,
    model:
      modelName
  });
}

const answer =
  data?.candidates?.[0]
    ?.content?.parts?.[0]
    ?.text;

if (!answer) {
  return res.status(500).json({
    success: false,
    error: "Gemini وەڵامی بەتاڵی گەڕاندەوە.",
    model: modelName,
    response: data
  });
}

return res.status(200).json({
  success: true,
  answer: String(answer).trim(),
  model: modelName
});
```

} catch (error) {

```
console.error(
  "ShahanFX Gemini Error:",
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
