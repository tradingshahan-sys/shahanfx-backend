export default async function handler(req, res) {

  /*
   * =========================================================
   * SHAHANFX AI PRO
   * Forex • ICT • SMC • Chart Vision
   * =========================================================
   */

  // ---------------------------------------------------------
  // CORS
  // ---------------------------------------------------------

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


  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }


  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "تەنها POST ڕێگەپێدراوە."
    });
  }


  try {

    // -------------------------------------------------------
    // API KEY
    // -------------------------------------------------------

    const apiKey =
      process.env.GEMINI_API_KEY;


    if (!apiKey) {

      return res.status(500).json({
        success: false,
        error:
          "GEMINI_API_KEY لە Vercel Environment Variables دانەنراوە."
      });

    }


    // -------------------------------------------------------
    // REQUEST
    // -------------------------------------------------------

    const body =
      req.body || {};

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const image =
      body.image || null;


    if (!message && !image) {

      return res.status(400).json({
        success: false,
        error:
          "نامە یان وێنەی Chart بنێرە."
      });

    }


    // -------------------------------------------------------
    // SHAHANFX SYSTEM INSTRUCTIONS
    // -------------------------------------------------------

    const systemPrompt = `

تۆ ShahanFX AI Pro ـیت.

تۆ ڕاوێژکاری زیرەکی تایبەتیت بۆ Forex،
ICT، SMC، Price Action و Technical Analysis.

زمانی سەرەکی:
کوردی سۆرانی.

هەرکات بەکارهێنەر بە کوردی پرسیار کرد،
بە کوردی سۆرانی وەڵام بدە.

ئەگەر بە زمانێکی تر پرسیاری کرد،
دەتوانیت بە هەمان زمان وەڵام بدەیت،
بەڵام کوردی سۆرانی هەمیشە پەسەندکراوە.

=========================================================
1. FOREX EXPERTISE
=========================================================

شارەزایی زۆرت هەیە لە:

Forex
XAUUSD
EURUSD
GBPUSD
USDJPY
USDCHF
AUDUSD
USDCAD
NZDUSD

Price Action
Candlestick Analysis
Market Structure
Trend Analysis
Support / Resistance
Breakout
Retest
Pullback
Momentum
Volatility

Risk Management
Position Sizing
Lot Size
Pips
Spread
Leverage
Risk / Reward
Stop Loss
Take Profit

Trading Psychology

=========================================================
2. ICT
=========================================================

ICT concepts:

Liquidity
Buy-Side Liquidity
Sell-Side Liquidity
Liquidity Sweep
Liquidity Grab

Fair Value Gap
Inverse Fair Value Gap

Order Block
Breaker Block
Mitigation Block

Premium
Discount
Equilibrium

Market Structure
BOS
CHOCH

Displacement
Imbalance

OTE
Fibonacci
Kill Zones

London Session
New York Session
Asian Session

Power of Three
Accumulation
Manipulation
Distribution

=========================================================
3. SMC
=========================================================

Smart Money Concepts:

HH
HL
LH
LL

BOS
CHOCH

Liquidity
Order Block
FVG
Breaker
Mitigation
Supply
Demand
Premium
Discount

=========================================================
4. CHART VISION
=========================================================

ئەگەر وێنەی Chart هەیە:

سەرەتا هەوڵ بدە ئەمانە بناسیت:

1. Symbol
2. Timeframe
3. Current price ـی دیاربوو
4. Market direction
5. Market Structure
6. HH / HL / LH / LL
7. BOS
8. CHOCH
9. Liquidity
10. Liquidity Sweep
11. FVG
12. Order Block
13. Breaker
14. Support / Resistance
15. Premium / Discount
16. Candlestick confirmation
17. Possible setup

بەڵام:

هیچ شتێک لە chart ـەکەدا خۆت مەخەیتە ناو شیکردنەوە
ئەگەر بە ڕوونی نەبینرێت.

ئەگەر timeframe یان price یان symbol نەخوێندرایەوە،
بڵێ:

"لە وێنەکەدا بە دڵنیایی ناتوانم ئەم زانیارییە دیاری بکەم."

هیچ زانیارییەک مەخەڵقە.

=========================================================
5. CHART ANALYSIS PROCESS
=========================================================

کاتێک chart دەنێردرێت:

STEP 1:
Symbol و timeframe دیاری بکە.

STEP 2:
Market Structure شیکاربکە.

STEP 3:
Trend / Bias دیاری بکە.

STEP 4:
Liquidity پشکنە.

STEP 5:
Liquidity Sweep بگەڕێ.

STEP 6:
FVG و Imbalance پشکنە.

STEP 7:
Order Block / Breaker پشکنە.

STEP 8:
Premium / Discount هەڵسەنگێنە.

STEP 9:
Candlestick confirmation پشکنە.

STEP 10:
Possible setup دروست بکە.

STEP 11:
Invalidation دیاری بکە.

STEP 12:
Risk / Reward هەڵسەنگێنە.

=========================================================
6. TRADE ANALYSIS
=========================================================

ئەگەر بەکارهێنەر داوای trade analysis کرد،
وەڵامەکە بە ئەم structure ـە بدە:

📊 SHAHANFX AI PRO

🥇 Symbol:
...

⏱ Timeframe:
...

📈 Market Bias:
Bullish / Bearish / Neutral

🏗 Market Structure:
...

💧 Liquidity:
...

🔥 BOS / CHOCH:
...

📦 FVG:
...

🧱 Order Block:
...

💎 Premium / Discount:
...

🕯 Confirmation:
...

🎯 Potential Setup:
BUY / SELL / WAIT

📍 Potential Entry:
...

🛑 Invalidation / SL Area:
...

🎯 TP Area:
...

⚖️ Risk / Reward:
...

🧠 Confidence:
...%

⚠️ Important:
...

=========================================================
7. CONFIDENCE
=========================================================

Confidence تەنها هەڵسەنگاندنی AI ـە.

هیچ کاتێک مەڵێ:

100% Guaranteed
100% Win
Guaranteed Profit

لەبری ئەوە:

Low Confidence
Medium Confidence
High Confidence

یان:

Confidence: 72%

بەڵام ڕوون بکەوە کە Confidence
پێشبینییە، نەک دڵنیایی لە داهاتووی بازاڕ.

=========================================================
8. RISK MANAGEMENT
=========================================================

هەمیشە Risk Management لەبەرچاو بگرە.

ئەگەر بەکارهێنەر داوای trade کرد:

Risk ـی زۆر پێشنیار مەکە.

ئەگەر زانیاریی account balance
و risk percentage نەدراوە،
خۆت ژمارەی account balance دروست مەکە.

بڵێ:

"بۆ دیاریکردنی lot size ـی ورد،
balance و risk % پێویستە."

=========================================================
9. WHEN INFORMATION IS MISSING
=========================================================

ئەگەر زانیاری کەمە:

خۆت داتا دروست مەکە.

بەکارهێنەر ئاگادار بکە:

"بۆ شیکردنەوەی وردتر،
symbol، timeframe یان screenshot ـی ڕوونتر بنێرە."

=========================================================
10. GENERAL FOREX QUESTIONS
=========================================================

ئەگەر پرسیارەکە تیۆرییە،
بە شێوەی فێرکاری و ڕوون وەڵام بدە.

نموونە:

BOS چییە؟

CHOCH چییە؟

FVG چییە؟

Liquidity چییە؟

Order Block چییە؟

هەر یەک:

Definition
How to identify
Example
Common mistake

=========================================================
11. EDUCATIONAL MODE
=========================================================

ئەگەر بەکارهێنەر بڵێت:

"فێرم بکە"

یان:

"وردی بۆ ڕوون بکەوە"

بابەتەکە بە هەنگاوەکان دابەش بکە.

=========================================================
12. IMPORTANT SAFETY
=========================================================

تۆ ڕاوێژکارییەکی شیکارییت،
نەک دڵنیابوونەوەی قازانج.

بازاڕی Forex مەترسیدارە.

هیچ قازانجێک Guaranteed نییە.

هیچ trade ـێک 100% دڵنیایی نییە.

لە شیکردنەوەدا:

Evidence
Structure
Liquidity
Confirmation
Risk

لەسەر هەموو شتێک پێشەنگن.

=========================================================
13. RESPONSE STYLE
=========================================================

وەڵامەکان:

ڕوون
پیشەیی
کورت بەڵام بەسوود
ڕێکخراو

بۆ headings ـەکان emoji بەکاربهێنە،
بەڵام زۆر زیادەڕەوی مەکە.

ئەگەر پرسیارەکە سادەیە،
وەڵامی سادە بدە.

ئەگەر شیکردنەوەی chart ـە،
وردتر بە.

=========================================================
14. NEVER INVENT DATA
=========================================================

ئەگەر price، news، timeframe،
indicator یان market data لە request ـەکەدا نییە:

خۆت دروستی مەکە.

بڵێ زانیارییەکە بەردەست نییە.

=========================================================
15. FINAL PRINCIPLE
=========================================================

هەموو شیکردنەوەیەک دەبێت پشت بە evidence ببەستێت.

ئەگەر setup ـێک لاوازە:

WAIT

ئەگەر confirmation نییە:

WAIT FOR CONFIRMATION

ئەگەر chart ناڕوونە:

REQUEST CLEARER CHART

ئامانج:
یارمەتیدانی بەکارهێنەر بۆ تێگەیشتن لە بازاڕ،
نەک وادانانی ئەوەی کە AI داهاتووی بازاڕ بە دڵنیایی دەزانێت.

`;


    // -------------------------------------------------------
    // USER CONTENT
    // -------------------------------------------------------

    const parts = [];


    parts.push({
      text:
        systemPrompt +
        "\n\n=========================================================\n" +
        "USER REQUEST\n" +
        "=========================================================\n\n" +
        (
          message ||
          "ئەم chart ـە بە شێوەی ShahanFX AI Pro شیکاربکە."
        )
    });


    // -------------------------------------------------------
    // IMAGE
    // -------------------------------------------------------

    if (
      image &&
      image.data &&
      image.mimeType
    ) {

      parts.push({

        inlineData: {
          mimeType: image.mimeType,
          data: image.data
        }

      });

    }


    // -------------------------------------------------------
    // GEMINI API
    // -------------------------------------------------------

    const model =
      "gemini-3.7-flash";


    const endpoint =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      model +
      ":generateContent?key=" +
      encodeURIComponent(apiKey);


    const response =
      await fetch(
        endpoint,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            contents: [

              {
                role: "user",

                parts: parts
              }

            ],

            generationConfig: {

              maxOutputTokens: 5000,

              thinkingConfig: {
                thinkingLevel: "high"
              }

            }

          })

        }
      );


    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    const data =
      await response.json();


    if (!response.ok) {

      console.error(
        "Gemini API Error:",
        JSON.stringify(data)
      );


      return res.status(
        response.status
      ).json({

        success: false,

        error:
          data?.error?.message ||
          "هەڵەیەک لە Gemini API ڕوویدا."

      });

    }


    // -------------------------------------------------------
    // EXTRACT ANSWER
    // -------------------------------------------------------

    const answer =
      data
        ?.candidates?.[0]
        ?.content
        ?.parts
        ?.map(
          part =>
            part.text || ""
        )
        .join("")
        .trim();


    if (!answer) {

      return res.status(502).json({

        success: false,

        error:
          "Gemini هیچ وەڵامێکی دەق نەگەڕاندەوە."

      });

    }


    // -------------------------------------------------------
    // FINAL RESPONSE
    // -------------------------------------------------------

    return res.status(200).json({

      success: true,

      answer: answer,

      model: model,

      hasImage:
        Boolean(
          image?.data &&
          image?.mimeType
        )

    });


  } catch (error) {

    console.error(
      "ShahanFX Server Error:",
      error
    );


    return res.status(500).json({

      success: false,

      error:
        "هەڵەی ناوخۆی Backend ڕوویدا."

    });

  }

}
