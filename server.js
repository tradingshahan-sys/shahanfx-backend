const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// بەستنەوە بە Gemini API بە کلیلی نهێنی ناو Render
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/analyze-chart', async (req, res) => {
    try {
        const { imageBase64, prompt } = req.body;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                prompt || "شیکاری ئەم چارتی XAUUSD ـە بکە و نیشانەکان و ئاراستە دەستنیشان بکە.",
                {
                    inlineData: {
                        data: imageBase64.split(',')[1],
                        mimeType: 'image/jpeg'
                    }
                }
            ]
        });

        res.json({ success: true, analysis: response.text });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
