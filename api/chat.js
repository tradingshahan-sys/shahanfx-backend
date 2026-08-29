export default async function handler(req, res) {
  // ڕێگەدان بە Google Sites و هەموو ماڵپەڕەکانی تر (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // وەستاندنی داواکاری تاقیکردنەوەی پێشینە (Preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ reply: "کلیلی GEMINI_API_KEY لە Vercel دانەنراوە." });
    }

    const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }]
      })
    });

    const data = await apiRes.json();
    
    let reply = "وەڵامێک لە جێمینی نەگەڕایەوە.";
    if (data.candidates && data.candidates[0] && data.candidates[0].content.parts[0].text) {
      reply = data.candidates[0].content.parts[0].text;
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ reply: "هەڵەیەک لە سێرڤەر ڕوویدا.", error: error.message });
  }
}
