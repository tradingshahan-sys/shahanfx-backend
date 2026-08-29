export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const message = req.body?.message || "سڵاو";
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ reply: 'کڵیدی API بوونی نییە.' });
    }

    const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }]
      })
    });

    const data = await apiRes.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "وەڵام نەگەڕایەوە.";

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ reply: 'هەڵە ڕووی دا.' });
  }
}
