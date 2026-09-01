export default async function handler(req, res) {

  /*
   * =========================================================
   * SHAHANFX AI PRO
   * Forex • ICT • SMC • Chart Vision
   * Gemini Fallback System
   * =========================================================
   */

  // =========================================================
  // CORS
  // =========================================================

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


  // =========================================================
  // OPTIONS
  // =========================================================

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }


  // =========================================================
  // ONLY POST
  // =========================================================

  if (req.method !== "POST") {

    return res.status(405).json({
      success: false,
      error: "تەنها POST ڕێگەپێدراوە."
    });

  }


  try {

    // =======================================================
    // API KEY
    // =======================================================

    const apiKey =
      process.env.GEMINI_API_KEY;


    if (!apiKey) {

      return res.status(500).json({
        success: false,
        error:
          "GEMINI_API_KEY لە Vercel Environment Variables دانەنراوە."
      });

    }


    // =======================================================
    // REQUEST BODY
    // =======================================================

    const body =
      req.body || {};


    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";


    const image =
      body.image || null;


    // =======================================================
    // VALIDATION
    // =======================================================

    if (!message && !image) {

      return res.status(400).json({
        success: false,
        error:
          "تکایە پرسیار یان وێنەی Chart بنێرە."
      });

    }


    // =======================================================
    // SHAHANFX AI SYSTEM PROMPT
    // =======================================================

    const systemPrompt = `

تۆ ShahanFX AI Pro ـیت.

تۆ ڕاوێژکاری زیرەکی تایبەتیت بۆ:

Forex
ICT
SMC
Price Action
Technical Analysis
Chart Analysis
Risk Management

=========================================================
زمان
=========================================================

زمانی سەرەکی:

کوردی سۆرانی.

ئەگەر بەکارهێنەر بە کوردی پرسیار کرد،
بە کوردی سۆرانی وەڵام بدە.

وەڵامەکان ڕوون،
پیشەیی،
ڕێکخراو،
و بەسوود بن.

=========================================================
FOREX EXPERT
=========================================================

لەمانەدا شارەزاییت هەیە:

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
Technical Analysis
Market Structure
Trend
Support
Resistance
Breakout
Retest
Pullback
Momentum
Volatility

Pips
Points
Spread
Leverage
Lot Size
Position Size
Risk Management
Stop Loss
Take Profit
Risk Reward
Trading Psychology

=========================================================
ICT
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

Asian Session
London Session
New York Session

Kill Zones

Power Of Three
Accumulation
Manipulation
Distribution

=========================================================
SMC
=========================================================

Smart Money Concepts:

Higher High
Higher Low
Lower High
Lower Low

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
CHART VISION
=========================================================

ئەگەر بەکارهێنەر وێنەی Chart نارد:

سەرەتا هەوڵ بدە ئەمانە بخوێنیتەوە:

1. Symbol
2. Timeframe
3. Price
4. Trend
5. Market Structure
6. HH
7. HL
8. LH
9. LL
10. BOS
11. CHOCH
12. Liquidity
13. Liquidity Sweep
14. FVG
15. Order Block
16. Breaker Block
17. Support
18. Resistance
19. Premium
20. Discount
21. Candlestick confirmation

بەڵام:

هیچ شتێک مەخەڵقە.

ئەگەر لە chart ـەکەدا بە ڕوونی نەبینرێت،
بڵێ:

"ئەم زانیارییە لە وێنەکەدا بە دڵنیایی دیار نییە."

=========================================================
CHART ANALYSIS PROCESS
=========================================================

کاتێک Chart هەیە:

STEP 1
Symbol و timeframe دیاری بکە.

STEP 2
Trend دیاری بکە.

STEP 3
Market Structure شیکاربکە.

STEP 4
HH / HL / LH / LL بپشکنە.

STEP 5
BOS / CHOCH بپشکنە.

STEP 6
Liquidity بگەڕێ.

STEP 7
Liquidity Sweep بپشکنە.

STEP 8
FVG بپشکنە.

STEP 9
Order Block بپشکنە.

STEP 10
Premium / Discount بپشکنە.

STEP 11
Candlestick confirmation بپشکنە.

STEP 12
Potential Setup هەڵسەنگێنە.

STEP 13
Invalidation دیاری بکە.

STEP 14
Risk / Reward هەڵسەنگێنە.

=========================================================
TRADE ANALYSIS
=========================================================

ئەگەر بەکارهێنەر داوای trade analysis کرد،
وەڵامەکە بە ئەم شێوەیە ڕێکبخە:

📊 SHAHANFX AI PRO

🥇 Symbol:
...

⏱ Timeframe:
...

📈 Market Bias:
Bullish / Bearish / Neutral

🏗 Market Structure:
...

🔥 BOS / CHOCH:
...

💧 Liquidity:
...

📦 FVG:
...

🧱 Order Block:
...

💎 Premium / Discount:
...

🕯 Candlestick Confirmation:
...

🎯 Potential Setup:
BUY / SELL / WAIT

📍 Potential Entry:
...

🛑 Invalidation:
...

🛑 Potential SL:
...

🎯 Potential TP:
...

⚖️ Risk / Reward:
...

🧠 Confidence:
...%

⚠️ Important:
...

=========================================================
CONFIDENCE
=========================================================

Confidence تەنها هەڵسەنگاندنی AI ـە.

هیچ کاتێک مەڵێ:

100% Guaranteed
100% Win
Guaranteed Profit

هیچ trade ـێک 100% دڵنیایی نییە.

Confidence دەتوانێت:

Low
Medium
High

یان:

Confidence: 72%

بەڵام هەمیشە ڕوون بکەوە:

"Confidence پێشبینیی AI ـە، نەک دڵنیایی لە داهاتووی بازاڕ."

=========================================================
RISK MANAGEMENT
=========================================================

Risk Management زۆر گرنگە.

ئەگەر account balance
و risk percentage نەدراوە:

خۆت balance دروست مەکە.

خۆت lot size ـی ورد دروست مەکە.

بڵێ:

"بۆ دیاریکردنی Lot Size ـی ورد،
Balance و Risk % پێویستە."

ئەگەر Risk/Reward کەمە،
ئاگاداری بەکارهێنەر بکە.

=========================================================
GENERAL FOREX
=========================================================

ئەگەر پرسیارەکە فێرکارییە:

Definition
How it works
How to identify
Example
Common mistake

بەکاربهێنە.

نموونە:

BOS چییە؟

CHOCH چییە؟

FVG چییە؟

Liquidity چییە؟

Order Block چییە؟

Premium و Discount چییە؟

=========================================================
EDUCATION MODE
=========================================================

ئەگەر بەکارهێنەر بڵێت:

"فێرم بکە"

یان:

"وردی بۆ ڕوون بکەوە"

بابەتەکە بە هەنگاوەکان دابەش بکە.

=========================================================
MISSING INFORMATION
=========================================================

ئەگەر زانیاری کەمە:

خۆت data دروست مەکە.

بڵێ:

"بۆ شیکردنەوەی وردتر،
Symbol، Timeframe یان Screenshot ـێکی ڕوونتر بنێرە."

=========================================================
LIVE DATA
=========================================================

ئەگەر هیچ live market data ـی پێنەدراوە:

خۆت price ـی ئێستا دروست مەکە.

خۆت news دروست مەکە.

خۆت current market condition دروست مەکە.

بڵێ:

"بۆ current market analysis،
live market data پێویستە."

=========================================================
IMPORTANT
=========================================================

تۆ ڕاوێژکارییەکی شیکارییت،
نەک دڵنیابوونەوەی قازانج.

Forex و CFD مەترسیدارن.

هیچ قازانجێک Guaranteed نییە.

هیچ trade ـێک 100% دڵنیایی نییە.

Evidence
Structure
Liquidity
Confirmation
Risk

لە هەموو شتێک پێشەنگن.

ئەگەر setup لاوازە:

WAIT

ئەگەر confirmation نییە:

WAIT FOR CONFIRMATION

ئەگەر chart ناڕوونە:

REQUEST CLEARER CHART

=========================================================
FINAL PRINCIPLE
=========================================================

ئامانجی ShahanFX AI:

یارمەتیدانی بەکارهێنەر بۆ تێگەیشتن لە بازاڕ،
فێربوونی Forex،
شیکردنەوەی Chart،
و بەکارهێنانی Risk Management.

نەک دروستکردنی دڵنیایی ساختە.

`;


    // =======================================================
    // USER REQUEST + SYSTEM PROMPT
    // =======================================================

    const parts = [];


    parts.push({

      text:
        systemPrompt +

        `

=========================================================
USER REQUEST
=========================================================

${

  message ||

  "تکایە ئەم Chart ـە بە شێوەی ShahanFX AI Pro شیکاربکە."

}

`

    });


    // =======================================================
    // IMAGE
    // =======================================================

    if (
      image &&
      image.data &&
      image.mimeType
    ) {

      parts.push({

        inlineData: {

          mimeType:
            image.mimeType,

          data:
            image.data

        }

      });

    }


    // =======================================================
    // MODELS
    // =======================================================

    /*
     * Primary:
     * Gemini 3.7 Flash
     *
     * Fallback:
     * Gemini 3.6 Flash
     *
     * Backup:
     * Gemini 3.5 Flash
     */

    const models = [

      "gemini-3.7-flash",

      "gemini-3.6-flash",

      "gemini-3.5-flash"

    ];


    // =======================================================
    // RETRY SETTINGS
    // =======================================================

    const MAX_RETRIES_PER_MODEL = 2;

    const BASE_DELAY = 1200;


    // =======================================================
    // VARIABLES
    // =======================================================

    let response = null;

    let data = null;

    let usedModel = null;


    // =======================================================
    // MODEL LOOP
    // =======================================================

    outerLoop:

    for (
      const model of models
    ) {

      for (
        let attempt = 0;
        attempt < MAX_RETRIES_PER_MODEL;
        attempt++
      ) {


        // ===================================================
        // ENDPOINT
        // ===================================================

        const endpoint =
          "https://generativelanguage.googleapis.com/v1beta/models/" +
          model +
          ":generateContent?key=" +
          encodeURIComponent(apiKey);


        try {

          // =================================================
          // REQUEST
          // =================================================

          response =
            await fetch(
              endpoint,
              {

                method:
                  "POST",

                headers: {

                  "Content-Type":
                    "application/json"

                },

                body:
                  JSON.stringify({

                    contents: [

                      {

                        role:
                          "user",

                        parts:
                          parts

                      }

                    ],

                    generationConfig: {

                      maxOutputTokens:
                        5000,

                      thinkingConfig: {

                        thinkingLevel:
                          "medium"

                      }

                    }

                  })

              }
            );


          // =================================================
          // JSON
          // =================================================

          data =
            await response.json();


          // =================================================
          // SUCCESS
          // =================================================

          if (
            response.ok
          ) {

            usedModel =
              model;

            break outerLoop;

          }


          // =================================================
          // ERROR MESSAGE
          // =================================================

          const errorText =
            String(
              data?.error?.message ||
              ""
            ).toLowerCase();


          // =================================================
          // RETRYABLE ERRORS
          // =================================================

          const retryable =

            response.status === 429 ||

            response.status === 500 ||

            response.status === 502 ||

            response.status === 503 ||

            response.status === 504 ||

            errorText.includes(
              "high demand"
            ) ||

            errorText.includes(
              "temporarily unavailable"
            ) ||

            errorText.includes(
              "overloaded"
            ) ||

            errorText.includes(
              "unavailable"
            ) ||

            errorText.includes(
              "resource exhausted"
            );


          // =================================================
          // NON-RETRYABLE
          // =================================================

          if (!retryable) {

            console.error(
              "Non-retryable Gemini error:",
              data
            );

            break outerLoop;

          }


          // =================================================
          // RETRY DELAY
          // =================================================

          if (
            attempt <
            MAX_RETRIES_PER_MODEL - 1
          ) {

            const delay =
              BASE_DELAY *
              Math.pow(
                2,
                attempt
              );


            console.log(
              `ShahanFX AI: ${model} busy. ` +
              `Retry ${attempt + 1}. ` +
              `Waiting ${delay}ms`
            );


            await new Promise(
              resolve =>
                setTimeout(
                  resolve,
                  delay
                )
            );

          }

        }

        catch (error) {

          console.error(
            `Network error on ${model}:`,
            error
          );


          if (
            attempt <
            MAX_RETRIES_PER_MODEL - 1
          ) {

            const delay =
              BASE_DELAY *
              Math.pow(
                2,
                attempt
              );


            await new Promise(
              resolve =>
                setTimeout(
                  resolve,
                  delay
                )
            );

          }

        }

      }

    }


    // =======================================================
    // ALL MODELS FAILED
    // =======================================================

    if (
      !response ||
      !response.ok ||
      !usedModel
    ) {

      console.error(
        "All Gemini models failed:",
        data
      );


      const originalError =
        data?.error?.message ||
        "";


      return res.status(503).json({

        success:
          false,

        error:
          "⚠️ ShahanFX AI لە ئێستادا بەهۆی زۆری داواکارییەکانەوە بەردەست نییە. تکایە دووبارە هەوڵ بدە.",

        details:
          originalError || null

      });

    }


    // =======================================================
    // EXTRACT ANSWER
    // =======================================================

    const answer =
      data
        ?.candidates?.[0]
        ?.content?.parts
        ?.map(
          part =>
            part.text || ""
        )
        .join("")
        .trim();


    // =======================================================
    // EMPTY RESPONSE
    // =======================================================

    if (!answer) {

      return res.status(502).json({

        success:
          false,

        error:
          "Gemini هیچ وەڵامێکی دەق نەگەڕاندەوە."

      });

    }


    // =======================================================
    // FINAL RESPONSE
    // =======================================================

    return res.status(200).json({

      success:
        true,

      answer:
        answer,

      model:
        usedModel,

      hasImage:
        Boolean(
          image?.data &&
          image?.mimeType
        )

    });


  }

  // =========================================================
  // SERVER ERROR
  // =========================================================

  catch (error) {

    console.error(
      "ShahanFX Server Error:",
      error
    );


    return res.status(500).json({

      success:
        false,

      error:
        "هەڵەی ناوخۆی Backend ڕوویدا."

    });

  }

}
