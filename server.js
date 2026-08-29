import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  // ڕێگەدان بە CORS بۆ ئەوەی لە Google Sites یان هەر شوێنێکی ترەوە کاربکات
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
    const { message } = req.body;
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
    });

    const reply = response.text || "وەڵامێک نەدۆزراوەتەوە.";
    return res.status(200).json({ reply });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ reply: "هەڵەیەک لە سێرڤەر ڕوویدا.", error: error.message });
  }
}
