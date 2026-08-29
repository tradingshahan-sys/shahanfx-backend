export default async function handler(req, res) {
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
if (req.method === 'OPTIONS') {
return res.status(200).end();
}
if (req.method !== 'POST') {
return res.status(405).json({ reply: 'تەنها فۆڕمی POST ڕێگەپێدراوە.' });
}
try {
const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
const message = body?.message;
if (!message) {
return res.status(400).json({ reply: 'تکایە پەیامێک بنووسە.' });
}
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
return res.status(500).json({ reply: 'کڵیدی API نەدۆزراوەتەوە.' });
}
const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ contents: [{ parts: [{ text: message }] }] })
});
const data = await apiRes.json();
let reply = "وەڵامێک نەگەڕایەوە.";
if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
reply = data.candidates[0].content.parts[0].text;
}
return res.status(200).json({ reply });
} catch (error) {
return res.status(500).json({ reply: 'هەڵەی سێرڤەر ڕووی دا.' });
}
}
