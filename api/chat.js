export default async function handler(req, res) {
res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");

if (req.method === "OPTIONS") {
return res.status(200).end();
}

if (req.method === "GET") {
const apiKey = process.env.GEMINI_API_KEY;

```
return res.status(200).json({
  success: true,
  backend: "OK",
  apiKey: apiKey ? "FOUND" : "MISSING"
});
```

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
    error: "GEMINI_API_KEY نەدۆزرایەوە."
  });
}

const url =
  "https://generativelanguage.googleapis.com/v1beta/models?key=" +
  encodeURIComponent(apiKey);

const googleResponse = await fetch(url);

const data = await googleResponse.json();

if (!googleResponse.ok) {
  return res.status(googleResponse.status).json({
    success: false,
    error:
      data?.error?.message ||
      "Gemini API هەڵەیەکی نەناسراوی گەڕاندەوە."
  });
}

const models = (data.models || [])
  .filter(function (model) {
    return Array.isArray(model.supportedGenerationMethods) &&
      model.supportedGenerationMethods.includes("generateContent");
  })
  .map(function (model) {
    return model.name;
  });

return res.status(200).json({
  success: true,
  apiKey: "FOUND",
  message: message,
  availableModels: models
});
```

} catch (error) {
console.error(error);

```
return res.status(500).json({
  success: false,
  error: error?.message || String(error)
});
```

}
}
