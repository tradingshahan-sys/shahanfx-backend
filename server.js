const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/analyze-chart', async (req, res) => {
try {
const { imageBase64, prompt } = req.body;
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const result = await model.generateContent([
prompt || "شیکاری ئەم چارتی XAUUSD بکە",
{
inlineData: {
data: imageBase64.split(',')[1],
mimeType: 'image/jpeg'
}
}
]);

const response = await result.response;
res.json({ success: true, analysis: response.text() });
} catch (error) {
console.error(error);
res.status(500).json({ success: false, error: error.message });
}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
