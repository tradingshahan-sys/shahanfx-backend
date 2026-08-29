const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai'); // یان هەر کتێبخانەیەک کە بۆ جێمینی بەکاری دەهێنیت

const app = express();
app.use(cors());
app.use(express.json());

// ئامادەکردنی جێمینی بە کلیلی نهێنی کە لە Vercel Environment Variables دانراوە
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    // ناردنی پەیام بۆ مۆدێلی جێمینی
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
    });

    const reply = response.text || "وەڵامێک نەدۆزراوەتەوە.";
    res.json({ reply });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ reply: "هەڵەیەک لە سێرڤەر ڕوویدا." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
