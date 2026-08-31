export default async function handler(req, res) {
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
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ success: false, answer: "کلیلەی API لە Vercel دابنە (GEMINI_API_KEY)." });
    }

    const SYSTEM_PERSONA = 
      "تو ShahanFx یان ڕاوێژکارێکی تایبەتی فۆڕێکس و گۆڵدی. شارەزا لە SMC, Fvg, Order Block. " +
      "بە زمانی کوردی شیرین و وەک هاوڕێیەکی تریدەر وەڵام بدەرەوە.";

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${SYSTEM_PERSONA}\n\nپرسیاری تریدەر: ${user_message}` }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates[0].content.parts[0].text) {
      return res.status(200).json({
        success: true,
        answer: data.candidates[0].content.parts[0].text
      });
    } else {
      return res.status(500).json({ success: false, answer: "وەڵام لە گووگڵەوە نەهاتەوە، کلیلەکەت پشکنین بکە." });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      answer: "هەڵەی سێرڤەر ڕوویدا."
    });
  }
}
