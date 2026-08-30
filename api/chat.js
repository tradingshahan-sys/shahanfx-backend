export default function handler(req, res) {
if (req.method === "OPTIONS") {
res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");
return res.status(200).end();
}

res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");

if (req.method === "POST") {
return res.status(200).json({
success: true,
answer: "POST_TEST_OK"
});
}

return res.status(405).json({
success: false,
error: "تەنها POST ڕێگەپێدراوە"
});
}
