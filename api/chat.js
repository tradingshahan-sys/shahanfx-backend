const { GoogleGenAI } = require('@google/genai');

// Vercel خۆی کلیلەکەی Environment Variable دەخوێنێتەوە
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PERSONA = 
    "تو شوان یان ڕاوێژکارێکی تایبەتی فۆڕێکس و گۆڵدی (ShahanFx) زۆر شارەزا، زیرەک و مرۆڤدۆستیت. " +
    "وەک تریدەرێکی خاوەن ئەزموون بیر بکەرەوە کە بازاڕ دەناسێت. " +
    "قسەکانت بە زمانێکی کوردی شیرین، سادە، بەڵام پڕ لە زانیاری زانستی (SMC, FVG, Order Block, Liquidity) دەبێت. " +
    "هەرگیز وەک رۆبۆتی سارد و وشک قسە مەکە؛ بەڵکو هۆشداری لە مەترسی بازاڕ بدە، هاندەر بە، و وەک هاوڕێیەک ڕێنمایی بدە.";

module.exports = async (req, res) => {
    // ڕێکخستنی CORS بۆ ئەوەی وێبسایتەکەت بتوانێت قسەی لەگەڵ بکات
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, answer: "تەنها ڕێگەپێدان بە POST هەیە." });
    }

    try {
        const user_message = req.body.message || '';
        const full_prompt = `${SYSTEM_PERSONA}\n\nپرسیاری تریدەر: ${user_message}`;

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: full_prompt,
        });

        return res.status(200).json({
            success: true,
            answer: response.text
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            answer: "برام، هەڵەیەک ڕوویدا لە پەیوەندیکردن بە مێشکی زیرەکەوە. دڵنیابەوە لە کلیلەکەی Vercel."
        });
    }
};
