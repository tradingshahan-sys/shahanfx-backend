export default async function handler(req, res) {

  // =========================================================
  // SHAHANFX AI PRO
  // Live Market + Economic News + Chart Vision
  // =========================================================

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

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

    // =======================================================
    // GEMINI KEY
    // =======================================================

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "GEMINI_API_KEY لە Vercel دانەنراوە."
      });
    }

    // =======================================================
    // BODY
    // =======================================================

    const body =
      req.body || {};

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const image =
      body.image || null;

    const symbol =
      body.symbol ||
      "XAUUSD";

    const interval =
      body.interval ||
      "5min";

    if (!message && !image) {
      return res.status(400).json({
        success: false,
        error: "تکایە پرسیار یان وێنەی Chart بنێرە."
      });
    }

    // =======================================================
    // GET LIVE MARKET
    // =======================================================

    let marketData = null;

    try {

      const host =
        req.headers.host;

      const protocol =
        req.headers["x-forwarded-proto"] ||
        "https";

      const marketURL =
        `${protocol}://${host}` +
        `/api/market?symbol=${encodeURIComponent(symbol)}` +
        `&interval=${encodeURIComponent(interval)}` +
        `&outputsize=100`;

      const marketResponse =
        await fetch(marketURL);

      marketData =
        await marketResponse.json();

    } catch (error) {

      console.error(
        "Market fetch failed:",
        error
      );

      marketData = {
        success: false,
        error: "Live market data بەردەست نەبوو."
      };

    }

    // =======================================================
    // GET NEWS
    // =======================================================

    let newsData = null;

    try {

      const host =
        req.headers.host;

      const protocol =
        req.headers["x-forwarded-proto"] ||
        "https";

      const newsURL =
        `${protocol}://${host}` +
        `/api/news`;

      const newsResponse =
        await fetch(newsURL);

      newsData =
        await newsResponse.json();

    } catch (error) {

      console.error(
        "News fetch failed:",
        error
      );

      newsData = {
        success: false,
        error: "Economic news بەردەست نەبوو."
      };

    }

    // =======================================================
    // SYSTEM PROMPT
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
Economic News
Risk Management

زمان:
هەمیشە بە کوردی سۆرانی وەڵام بدە.

=========================================================
LIVE DATA RULE
=========================================================

ئەگەر LIVE MARKET DATA لە خوارەوە هەیە،
تەنها ئەو داتایە بەکاربهێنە بۆ current market.

خۆت current price دروست مەکە.

ئەگەر News Data لە خوارەوە هەیە،
هەواڵەکان لەگەڵ candle reaction پەیوەندی پێوە بکە.

خۆت news دروست مەکە.

=========================================================
ICT / SMC
=========================================================

لەمانەدا شارەزاییت هەیە:

Market Structure
HH
HL
LH
LL
BOS
CHOCH

Liquidity
Buy-Side Liquidity
Sell-Side Liquidity
Liquidity Sweep

FVG
Order Block
Breaker Block
Mitigation Block

Premium
Discount
Equilibrium

Displacement
Imbalance

OTE
Fibonacci

Asian Session
London Session
New York Session
Kill Zones

Power Of Three

=========================================================
NEWS + CANDLE CORRELATION
=========================================================

ئەمە زۆر گرنگە.

کاتێک Economic Event ـێکی گرنگ هەیە:

1. Event ـەکە بناسە.
2. Actual / Forecast / Previous هەڵسەنگێنە ئەگەر بەردەست بوون.
3. دیاری بکە کام currency پەیوەندی پێوە هەیە.
4. بۆ XAUUSD کاریگەریی USD لەبەرچاو بگرە.
5. candle reaction بپشکنە.
6. volatility بپشکنە.
7. liquidity sweep بپشکنە.
8. displacement بپشکنە.
9. BOS / CHOCH بپشکنە.
10. FVG / Order Block بپشکنە.
11. هەردوو سەرچاوەکە پێکەوە هەڵبسەنگێنە.

هیچ کاتێک مەڵێ:

"News = guaranteed BUY"

یان:

"News = guaranteed SELL"

News تەنها یەک confirmation ـە.

=========================================================
CHART VISION
=========================================================

ئەگەر وێنەی Chart هەیە:

Symbol
Timeframe
Trend
Market Structure
HH
HL
LH
LL
BOS
CHOCH
Liquidity
Liquidity Sweep
FVG
Order Block
Premium
Discount
Candlestick Confirmation

هەموویان تەنها ئەگەر لە chart ـەکەدا بەڕوونی دیار بن.

هیچ شتێک مەخەڵقە.

=========================================================
ANALYSIS FORMAT
=========================================================

ئەگەر current market analysis داواکرا:

📊 SHAHANFX AI PRO

🥇 Symbol:
...

⏱ Timeframe:
...

💰 Current Price:
...

📈 Market Bias:
Bullish / Bearish / Neutral

📰 News:
...

⚡ News Impact:
Bullish / Bearish / Neutral / Unclear

🕯 Candle Reaction:
...

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

🎯 Setup:
BUY / SELL / WAIT

📍 Entry:
...

🛑 Invalidation:
...

🎯 TP:
...

⚖️ Risk/Reward:
...

🧠 Confidence:
Low / Medium / High

⚠️ Risk Warning:
هیچ trade ـێک 100% دڵنیایی نییە.

=========================================================
RISK
=========================================================

ئەگەر balance و risk % نییە:

lot size دروست مەکە.

بڵێ:
"Balance و Risk % پێویستە بۆ Lot Size."

هیچ قازانجێک guaranteed نییە.

=========================================================
LIVE MARKET DATA
=========================================================

${JSON.stringify(
  marketData,
  null,
  2
)}

=========================================================
ECONOMIC NEWS
=========================================================

${JSON.stringify(
  newsData,
  null,
  2
)}

=========================================================
USER QUESTION
=========================================================

${message || "ئەم Chart ـە بە live market و news شیکاربکە."}

`;

    // =======================================================
    // GEMINI PARTS
    // =======================================================

    const parts = [
      {
        text: systemPrompt
      }
    ];

    // =======================================================
    // IMAGE
    // =======================================================

    if (
      image?.data &&
      image?.mimeType
    ) {

      parts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data
        }
      });

    }

    // =======================================================
    // MODELS
    // =======================================================

    const models = [
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash"
    ];

    let response = null;
    let data = null;
    let usedModel = null;

    const MAX_RETRIES = 2;

    // =======================================================
    // GEMINI LOOP
    // =======================================================

    outerLoop:

    for (const model of models) {

      for (
        let attempt = 0;
        attempt < MAX_RETRIES;
        attempt++
      ) {

        try {

          const endpoint =
            "https://generativelanguage.googleapis.com/v1beta/models/" +
            model +
            ":generateContent?key=" +
            encodeURIComponent(apiKey);

          response =
            await fetch(
              endpoint,
              {
                method: "POST",

                headers: {
                  "Content-Type": "application/json"
                },

                body: JSON.stringify({

                  contents: [
                    {
                      role: "user",
                      parts
                    }
                  ],

                  generationConfig: {

                    temperature: 0.4,

                    maxOutputTokens: 5000

                  }

                })
              }
            );

          data =
            await response.json();

          if (response.ok) {

            usedModel =
              model;

            break outerLoop;

          }

          const errorText =
            String(
              data?.error?.message || ""
            ).toLowerCase();

          const retryable =

            response.status === 429 ||

            response.status === 500 ||

            response.status === 502 ||

            response.status === 503 ||

            response.status === 504 ||

            errorText.includes("high demand") ||

            errorText.includes("overloaded") ||

            errorText.includes("temporarily unavailable") ||

            errorText.includes("resource exhausted");

          if (!retryable) {
            break outerLoop;
          }

          if (
            attempt <
            MAX_RETRIES - 1
          ) {

            await new Promise(
              resolve =>
                setTimeout(
                  resolve,
                  1200 *
                  Math.pow(2, attempt)
                )
            );

          }

        } catch (error) {

          console.error(
            "Gemini error:",
            error
          );

          if (
            attempt <
            MAX_RETRIES - 1
          ) {

            await new Promise(
              resolve =>
                setTimeout(
                  resolve,
                  1200 *
                  Math.pow(2, attempt)
                )
            );

          }

        }

      }

    }

    // =======================================================
    // FAILED
    // =======================================================

    if (
      !response ||
      !response.ok ||
      !usedModel
    ) {

      return res.status(503).json({

        success: false,

        error:
          "⚠️ ShahanFX AI لە ئێستادا بەردەست نییە. تکایە دووبارە هەوڵ بدە.",

        details:
          data?.error?.message || null

      });

    }

    // =======================================================
    // ANSWER
    // =======================================================

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
          "Gemini هیچ وەڵامێکی دروستی نەگەڕاندەوە."

      });

    }

    // =======================================================
    // FINAL
    // =======================================================

    return res.status(200).json({

      success: true,

      answer,

      model:
        usedModel,

      hasImage:
        Boolean(
          image?.data &&
          image?.mimeType
        ),

      liveMarket:
        Boolean(
          marketData?.success
        ),

      liveNews:
        Boolean(
          newsData?.success
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
        "هەڵەی ناوخۆی ShahanFX Backend ڕوویدا."

    });

  }

}
