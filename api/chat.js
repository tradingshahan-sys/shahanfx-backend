export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    
    const message = body?.message;
    if (!message) {
      return res.status(400).json({ error: 'Message is required in JSON body' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not set in Vercel Environment Variables' });
    }

    const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }]
      })
    });

    const data = await apiRes.json();
    
    if (data.error) {
      return res.status(500).json({ 
        error: 'Google Gemini API Error', 
        details: data.error.message || data.error 
      });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response text generated.";
    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(500).json({ 
      error: 'Server Exception', 
      details: err.message 
    });
  }
}
