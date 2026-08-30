export default function handler(req, res) {
try {
if (req.method !== "POST") {
return res.status(405).json({
success: false,
error: "تەنها POST ڕێگەپێدراوە"
});
}

```
return res.status(200).json({
  success: true,
  answer: "TEST_OK"
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
