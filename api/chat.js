export default async function handler(req, res) {

  /*
   * =========================================================
   * SHAHANFX AI PRO
   * Live Market + Economic News + Chart Vision
   *
   * Flow:
   *
   * Frontend
   *    ↓
   * chat.js
   *    ├── market.js → Live Candles
   *    ├── news.js   → CPI / NFP / FOMC / PPI
   *    └── Gemini    → AI Analysis
   *
   * =========================================================
   */

  // =========================================================
  // CORS
  // =========================================================

  res.setHeader("Access-Control-Allow-Origin", "*");

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
    // GEMINI KEY
    // =======================================================

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error:
          "GEMINI_API_KEY لە Vercel Environment Variables دانەنراوە."
      });
    }

    // =======================================================
    // REQUEST
    // =======================================================

    const body = req.body || {};

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const image = body.image || null;

    const symbol =
      body.symbol ||
      "XAU/USD";

    const interval =
      body.interval ||
      "5min";

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
    // INTERNAL API BASE
    // =======================================================

    /*
     * Vercel:
     *
     * /api/chat.js
     * /api/market.js
     * /api/news.js
     *
     * لەبەر ئەوەی chat.js خۆی لە هەمان domain ـە،
     * URL ـی domain ـەکە لە request ـەکە وەردەگیرێت.
     */

    const protocol =
      req.headers["x-forwarded-proto"] ||
      "https";

    const host =
      req.headers["x-forwarded-host"] ||
      req.headers.host;

    const baseUrl =
      `${protocol}://${host}`;

    // =======================================================
    // GET LIVE MARKET DATA
    // =======================================================

    let marketData = null;

    try {

      const marketUrl =
        new URL(
          "/api/market",
          baseUrl
        );

      marketUrl.searchParams.set(
        "symbol",
        symbol
      );

      marketUrl.searchParams.set(
        "interval",
        interval
      );

      marketUrl.searchParams.set(
        "outputsize",
        "100"
      );

      const marketResponse =
        await fetch(
          marketUrl.toString(),
          {
            method: "GET",
            headers: {
              "Accept":
                "application/json"
            }
          }
        );

      if (marketResponse.ok) {

        marketData =
          await marketResponse.json();

      } else {

        console.error(
          "Market API failed:",
          marketResponse.status
        );

      }

    } catch (error) {

      console.error(
        "Market connection error:",
        error
      );

    }

    // =======================================================
    // GET NEWS DATA
    // =======================================================

    let newsData = null;

    try {

      const now =
        new Date();

      const today =
        now.toISOString()
          .slice(0, 10);

      const newsUrl =
        new URL(
          "/api/news",
          baseUrl
        );

      newsUrl.searchParams.set(
        "startDate",
        today
      );

      newsUrl.searchParams.set(
        "endDate",
        today
      );

      const newsResponse =
        await fetch(
          newsUrl.toString(),
          {
            method: "GET",
            headers: {
              "Accept":
                "application/json"
            }
          }
        );

      if (newsResponse.ok) {

        newsData =
          await newsResponse.json();

      } else {

        console.error(
          "News API failed:",
          newsResponse.status
        );

      }

    } catch (error) {

      console.error(
        "News connection error:",
        error
      );

    }

    // =======================================================
    // MARKET SUMMARY
    // =======================================================

    const marketSummary =
      marketData
        ? {
            source:
              marketData.source || null,

            symbol:
              marketData.symbol || symbol,

            interval:
              marketData.interval || interval,

            timestamp:
              marketData.timestamp || null,

            currentPrice:
              marketData?.market?.currentPrice ??
              null,

            direction:
              marketData?.market?.direction ??
              "neutral",

            currentCandle:
              marketData?.market?.currentCandle ??
              null,

            previousCandle:
              marketData?.market?.previousCandle ??
              null,

            candles:
              Array.isArray(
                marketData.candles
              )
                ? marketData.candles
                : []
          }
        : null;

    // =======================================================
    // NEWS SUMMARY
    // =======================================================

    const newsSummary =
      newsData
        ? {

            source:
              newsData.source || null,

            timestamp:
              newsData.timestamp || null,

            range:
              newsData.range || null,

            summary:
              newsData.summary || null,

            cpi:
              Array.isArray(newsData.cpi)
                ? newsData.cpi
                : [],

            nfp:
              Array.isArray(newsData.nfp)
                ? newsData.nfp
                : [],

            fomc:
              Array.isArray(newsData.fomc)
                ? newsData.fomc
                : [],

            ppi:
              Array.isArray(newsData.ppi)
                ? newsData.ppi
                : [],

            highImpact:
              Array.isArray(
                newsData.highImpact
              )
                ? newsData.highImpact
                : [],

            importantNews:
              Array.isArray(
                newsData.importantNews
              )
                ? newsData.importantNews
                : []

          }
        : null;

    // =======================================================
    // SYSTEM PROMPT
    // =======================================================

    const systemPrompt = `

تۆ ShahanFX AI Pro ـیت.

تۆ ڕاوێژکاری زیرەکی تایبەتیت بۆ:

Forex
XAUUSD / Gold
EURUSD
GBPUSD
USDJPY
ICT
SMC
Price Action
Market Structure
Liquidity
BOS
CHOCH
FVG
Order Block
Breaker
Mitigation
Premium
Discount
OTE
Fibonacci
Risk Management
Economic News
CPI
NFP
FOMC
PPI
GDP
Interest Rates

=========================================================
زمان
=========================================================

بە کوردی سۆرانی وەڵام بدە.

وەڵامەکان:
- ڕوون
- پیشەیی
- ڕێکخراو
- کورت بەڵام بەسوود

بن.

=========================================================
LIVE DATA RULE
=========================================================

لە کاتی ئەم پرسیارەدا
Live Market Data لە market.js هاتووە.

Economic News Data لە news.js هاتووە.

تەنها ئەو داتایە بەکاربهێنە کە لە
LIVE DATA
NEWS DATA
دا هەیە.

خۆت نرخ دروست مەکە.

خۆت هەواڵ دروست مەکە.

خۆت Actual / Forecast / Previous دروست مەکە.

ئەگەر داتا بەردەست نییە،
بە ڕوونی بڵێ:

"داتای ڕاستەوخۆی ئەم بەشە بەردەست نییە."

=========================================================
NEWS ANALYSIS
=========================================================

کاتێک بەکارهێنەر پرسیاری هەواڵ دەکات:

1. CPI بپشکنە.
2. NFP بپشکنە.
3. FOMC بپشکنە.
4. PPI بپشکنە.
5. High Impact Events بپشکنە.

ئەگەر Actual و Estimate هەبوو:

Actual
بەراورد بکە لەگەڵ
Estimate.

دواتر هەڵسەنگاندنی کاریگەری لەسەر:

USD
Gold
Forex

بکە.

بەڵام مەڵێ:
"دڵنیایە XAUUSD دەچێتە سەرەوە."

بڵێ:
"ئەم داتایە دەتوانێت فشار بۆ ... دروست بکات،
بەڵام reaction ـی price پێویستە پشتڕاستی بکاتەوە."

=========================================================
MARKET + NEWS
=========================================================

گرنگترین ئەرکی تۆ:

NEWS
+
LIVE PRICE
+
CANDLE
+
MARKET STRUCTURE
+
ICT / SMC

پێکەوە شیکاربکە.

بۆ نموونە:

CPI → Actual > Forecast

پاشان:

XAUUSD → Strong Bearish Displacement

ئەوا بڵێ:

"News و Price Reaction لە یەک ئاڕاستەدان."

بەڵام ئەگەر:

News Bullish
بەڵام Price Bearish

ئەوا بڵێ:

"News و Price Reaction یەک ئاڕاستە نین؛
چاوەڕێی Confirmation باشترە."

=========================================================
CANDLE ANALYSIS
=========================================================

لە live candles ـەکان:

Open
High
Low
Close

بپشکنە.

ئەگەر داتای کافی هەیە:

Trend
Momentum
Displacement
Rejection
Engulfing
Wick
Body
Higher High
Higher Low
Lower High
Lower Low

هەڵسەنگێنە.

هیچ pattern ـێک مەخەڵقە.

=========================================================
ICT / SMC
=========================================================

لە داتای بەردەستدا بپشکنە:

Liquidity
BSL
SSL
Liquidity Sweep
BOS
CHOCH
FVG
Order Block
Breaker
Mitigation
Premium
Discount
Displacement
Imbalance

ئەگەر داتای candles بەشی پێویستی بۆ پشتڕاستکردنەوەی شتێک نییە،
بڵێ:

"ئەم concept ـە لە داتای بەردەستدا بە دڵنیایی پشتڕاست ناکرێتەوە."

=========================================================
CHART IMAGE
=========================================================

ئەگەر بەکارهێنەر وێنەی Chart نارد:

وێنەکە بە جیاوازی شیکاربکە.

سەرەتا:

Symbol
Timeframe
Price

هەڵبگرە.

دواتر:

Trend
Market Structure
HH
HL
LH
LL
BOS
CHOCH
Liquidity
FVG
Order Block
Premium / Discount
Candlestick Confirmation

بپشکنە.

هیچ شتێک لە وێنەکەدا مەخەڵقە.

ئەگەر نادیارە،
بڵێ:

"لە وێنەکەدا بە دڵنیایی دیار نییە."

=========================================================
TRADE SETUP
=========================================================

ئەگەر setup ـێک بەهێز نییە:

WAIT

ئەگەر confirmation نییە:

WAIT FOR CONFIRMATION

ئەگەر news volatility زۆرە:

ئاگاداری بکە.

Trade setup بە ئەم شێوەیە:

📊 SHAHANFX AI PRO

🥇 Symbol:
...

⏱ Timeframe:
...

💰 Current Price:
...

📰 News:
...

⚡ News Impact:
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

🕯 Candle Reaction:
...

🎯 Setup:
BUY / SELL / WAIT

📍 Potential Entry:
...

🛑 Invalidation:
...

🎯 Potential TP:
...

⚖️ Risk/Reward:
...

🧠 Confidence:
Low / Medium / High

⚠️ Risk:
...

=========================================================
RISK
=========================================================

هیچ trade ـێک 100% دڵنیایی نییە.

هیچ Guaranteed Profit نییە.

ئەگەر Balance و Risk % نییە:

Lot Size دروست مەکە.

بڵێ:

"بۆ Lot Size ـی ورد Balance و Risk % پێویستە."

=========================================================
FINAL RULE
=========================================================

Evidence > Prediction

Price Reaction > Assumption

Confirmation > Guess

Risk Management > Profit

ئەگەر setup لاوازە:

WAIT.

`;

    // =======================================================
    // DATA FOR AI
    // =======================================================

    const liveDataText = `

=========================================================
LIVE MARKET DATA
=========================================================

${JSON.stringify(
  marketSummary,
  null,
  2
)}

=========================================================
ECONOMIC NEWS DATA
=========================================================

${JSON.stringify(
  newsSummary,
  null,
  2
)}

`;

    // =======================================================
    // USER REQUEST
    // =======================================================

    const userPrompt = `

${systemPrompt}

${liveDataText}

=========================================================
USER QUESTION
=========================================================

${message || "ئەم Chart ـە شیکاربکە."}

=========================================================
IMPORTANT
=========================================================

لە وەڵامەکەتدا
Live Market Data و News Data
لەگەڵ یەکدا شیکاربکە.

ئەگەر هەردووکیان بەردەستن،
پەیوەندی نێوان News Reaction و Price Reaction ڕوون بکەوە.

ئەگەر داتا نییە،
خۆت دروستی مەکە.

`;

    // =======================================================
    // GEMINI CONTENTS
    // =======================================================

    const parts = [
      {
        text: userPrompt
      }
    ];

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

    const models = [
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash"
    ];

    // =======================================================
    // RETRY
    // =======================================================

    const MAX_RETRIES = 2;

    const BASE_DELAY = 1200;

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
        attempt < MAX_RETRIES;
        attempt++
      ) {

        const endpoint =
          "https://generativelanguage.googleapis.com/v1beta/models/" +
          model +
          ":generateContent?key=" +
          encodeURIComponent(apiKey);

        try {

          response =
            await fetch(
              endpoint,
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body:
                  JSON.stringify({

                    contents: [
                      {
                        role: "user",
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

          data =
            await response.json();

          // =================================================
          // SUCCESS
          // =================================================

          if (response.ok) {

            usedModel =
              model;

            break outerLoop;

          }

          // =================================================
          // ERROR
          // =================================================

          const errorText =
            String(
              data?.error?.message ||
              ""
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

            console.error(
              "Gemini non-retryable error:",
              data
            );

            break outerLoop;

          }

          if (
            attempt <
            MAX_RETRIES - 1
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

        catch (error) {

          console.error(
            `Gemini ${model} error:`,
            error
          );

          if (
            attempt <
            MAX_RETRIES - 1
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
    // ALL FAILED
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

      return res.status(503).json({

        success: false,

        error:
          "⚠️ ShahanFX AI لە ئێستادا بەردەست نییە. تکایە دووبارە هەوڵ بدە.",

        details:
          data?.error?.message ||
          null

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
    // EMPTY
    // =======================================================

    if (!answer) {

      return res.status(502).json({

        success: false,

        error:
          "Gemini هیچ وەڵامێکی دەق نەگەڕاندەوە."

      });

    }

    // =======================================================
    // FINAL RESPONSE
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
        ),

      marketSource:
        marketData?.source ||
        null,

      newsSource:
        newsData?.source ||
        null,

      marketPrice:
        marketData?.market?.currentPrice ??
        null

    });

  }

  // =========================================================
  // SERVER ERROR
  // =========================================================

  catch (error) {

    console.error(
      "SHAHANFX CHAT SERVER ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      error:
        "هەڵەی ناوخۆی ShahanFX AI ڕوویدا.",

      details:
        error?.message ||
        null

    });

  }

}
