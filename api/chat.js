export default async function handler(req, res) {

// =========================
// CORS
// =========================

res.setHeader(
"Access-Control-Allow-Origin",
"*"
);

res.setHeader(
"Access-Control-Allow-Methods",
"POST, OPTIONS"
);

res.setHeader(
"Access-Control-Allow-Headers",
"Content-Type"
);

// =========================
// OPTIONS
// =========================

if (req.method === "OPTIONS") {
return res.status(200).end();
}

// =========================
// POST ONLY
// =========================

if (req.method !== "POST") {
return res.status(405).json({
success: false,
error: "تەنها POST ڕێگەپێدراوە"
});
}

try {

```
// =========================
// GEMINI API KEY
// =========================

const apiKey =
  process.env.GEMINI_API_KEY;


if (!apiKey) {

  return res.status(500).json({
    success: false,
    error:
      "GEMINI_API_KEY لە Vercel نەدۆزرایەوە."
  });

}


// =========================
// REQUEST BODY
// =========================

let body = req.body;


if (typeof body === "string") {

  try {

    body = JSON.parse(body);

  } catch {

    return res.status(400).json({
      success: false,
      error:
        "JSON ـەکە دروست نییە."
    });

  }

}


const message =
  typeof body?.message === "string"
    ? body.message.trim()
    : "";


if (!message) {

  return res.status(400).json({
    success: false,
    error:
      "message پێویستە."
  });

}


// =========================
// SHAHANFX AI PROMPT
// =========================

const prompt = `
```

تۆ ShahanFX AI Advisor ـیت.

تۆ ڕاوێژکاری زیرەکی Forex و Trading ـیت.

وەڵامەکانت بە کوردی سۆرانی بنووسە، مەگەر بەکارهێنەر زمانی تر داوا بکات.

ئەرکەکانت:

1. Trend
2. Market Structure
3. Support / Resistance
4. Liquidity
5. FVG
6. Candlestick
7. Entry Zone
8. Stop Loss
9. Take Profit
10. Risk/Reward
11. Confidence
12. Risk Level

کاتێک بەکارهێنەر داوای شیکردنەوەی بازار دەکات:

* زانیارییەکانی بەکارهێنەر شیکەرەوە.
* ئەگەر Symbol نەدرا، پرسیاری Symbol بکە.
* ئەگەر Timeframe نەدرا، پرسیاری Timeframe بکە.
* Trend دیاری بکە.
* Market Structure شیکەرەوە.
* Liquidity بپشکنە.
* FVG بپشکنە.
* Support و Resistance دیاری بکە.
* Candlestick confirmation بپشکنە.
* Entry zone پێشنیار بکە ئەگەر setup ـەکە ڕوون بوو.
* Stop Loss و Take Profit پێشنیار بکە.
* Risk/Reward حساب بکە.
* Confidence بە % بنووسە.
* Risk Level دیاری بکە.

هیچ کاتێک دڵنیایی 100% لە Buy یان Sell مەدە.

هیچ قازانجێکی دڵنیایی بەڵێن مەدە.

Risk Management هەمیشە لەبەرچاو بگرە.

ئەگەر setup ـێکی باش نییە، بە ڕوونی بڵێ:
"NO TRADE — setup ـەکە بەهێز نییە."

کاتێک setup ـێکی ڕوون هەبوو، ئەم format ـە بەکاربهێنە:

📊 SHAHANFX ANALYSIS

Market:
Timeframe:
Trend:
Market Structure:
Liquidity:
FVG:
Support / Resistance:
Candlestick:

🎯 SETUP

Direction:
Entry:
Stop Loss:
Take Profit 1:
Take Profit 2:
Risk/Reward:

📈 Confidence:
⚠️ Risk:

وەڵامەکان کورت، ڕوون و پیشەیی بن.

پرسیاری بەکارهێنەر:

${message}

`;

```
// =========================
// GEMINI API
// =========================

const response = await fetch(

  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",

  {

    method: "POST",

    headers: {

      "Content-Type":
        "application/json",

      "x-goog-api-key":
        apiKey

    },

    body: JSON.stringify({

      contents: [

        {

          role: "user",

          parts: [

            {

              text: prompt

            }

          ]

        }

      ],

      generationConfig: {

        temperature: 0.3,

        maxOutputTokens: 1500

      }

    })

  }

);


// =========================
// GEMINI RESPONSE
// =========================

const data =
  await response.json();


// =========================
// ERROR
// =========================

if (!response.ok) {

  console.error(
    "Gemini Error:",
    data
  );


  const errorMessage =
    data?.error?.message ||
    "Gemini API Error";


  if (
    response.status === 429 ||
    errorMessage
      .toLowerCase()
      .includes("quota") ||
    errorMessage
      .toLowerCase()
      .includes("rate")
  ) {

    return res.status(429).json({

      success: false,

      error:
        "⏳ سنووری Gemini بۆ ئێستا پڕ بووە. تکایە کەمێک دواتر دووبارە هەوڵ بدە."

    });

  }


  return res.status(
    response.status
  ).json({

    success: false,

    error: errorMessage

  });

}


// =========================
// GET ANSWER
// =========================

const answer =

  data?.candidates?.[0]
    ?.content?.parts
    ?.map(
      part => part.text || ""
    )
    .join("")
    .trim();


if (!answer) {

  return res.status(500).json({

    success: false,

    error:
      "Gemini هیچ وەڵامێکی نەدا."

  });

}


// =========================
// SUCCESS
// =========================

return res.status(200).json({

  success: true,

  answer: answer

});
```

} catch (error) {

```
console.error(
  "ShahanFX Server Error:",
  error
);


return res.status(500).json({

  success: false,

  error:
    error?.message ||
    "هەڵەیەکی ناوخۆیی ڕوویدا."

});
```

}

}
