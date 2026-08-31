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
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    const user_message = body && body.message ? body.message : '';
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(200).json({ success: false, answer: "کلیلەی GEMINI_API_KEY لە Vercel نەدۆزراوەتەوە." });
    }

    const SYSTEM_PERSONA = 
      "تو ShahanFx یان ڕاوێژکارێکی تایبەتی فۆڕێکس و گۆڵدی. شارەزا لە SMC, FVG, Order Block. " +
      "بە زمانی کوردی شیرین و وەک هاوڕێیەکی تریدەر وەڵام بدەرەوە.";

    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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

    const data = await apiResponse.json();

    if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
      return res.status(200).json({
        success: true,
        answer: data.candidates[0].content.parts[0].text
      });
    } else {
      return res.status(200).json({ 
        success: false, 
        answer: "وەڵام لەلایەن گووگڵەوە گەڕایەوە بەڵام هەڵەی تێدابوو: " + JSON.stringify(data) 
      });
    }

  } catch (error) {
    return res.status(200).json({
      success: false,
      answer: "هەڵەی سێرڤەر: " + error.message
    });
  }
}
