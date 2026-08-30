export default async function handler(req, res) {
res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");

if (req.method === "OPTIONS") {
return res.status(200).end();
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

const response = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/models?key=" +
    encodeURIComponent(apiKey)
);

const data = await response.json();

if (!response.ok) {
  return res.status(response.status).json({
    success: false,
    error: data?.error?.message || "هەڵە لە Google Gemini API",
    status: response.status
  });
}

const models = (data.models || [])
  .filter(function (model) {
    return (
      Array.isArray(model.supportedGenerationMethods) &&
      model.supportedGenerationMethods.includes(
        "generateContent"
      )
    );
  })
  .map(function (model) {
    return {
      name: model.name,
      displayName: model.displayName,
      description: model.description,
      supportedGenerationMethods:
        model.supportedGenerationMethods
    };
  });

return res.status(200).json({
  success: true,
  message: "Model ـە بەردەستەکان بۆ ئەم API Key ـە:",
  count: models.length,
  models: models
});
```

} catch (error) {
return res.status(500).json({
success: false,
error:
error && error.message
? error.message
: String(error)
});
}
}
