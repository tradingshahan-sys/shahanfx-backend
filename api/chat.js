export default function handler(req, res) {
try {
res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");

```
if (req.method === "OPTIONS") {
  return res.status(200).end();
}

if (req.method !== "POST") {
  return res.status(405).json({
    success: false,
    error: "تەنها POST ڕێگەپێدراوە"
  });
}

return res.status(200).json({
  success: true,
  answer: "POST_TEST_OK"
});
```

} catch (error) {
return res.status(500).json({
success: false,
error: String(error)
});
}
}
