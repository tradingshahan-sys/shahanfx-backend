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
    error: "GEMINI_API_KEY نەدۆزرایەوە."
  });
}

const googleURL =
  "https://generativelanguage.googleapis.com/v1beta/models?key=" +
  encodeURIComponent(apiKey);

const googleResponse =
  await fetch(googleURL);

const text =
  await googleResponse.text();

return res.status(200).json({
  success: true,
  googleStatus: googleResponse.status,
  googleResponse: text.substring(0, 3000)
});
```

} catch (error) {

```
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
