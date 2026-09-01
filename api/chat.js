export default async function handler(req, res) {

  /*
   * =========================================================
   * SHAHANFX AI PRO
   * Forex • ICT • SMC • Chart Vision
   * LIVE MARKET + NEWS + AI
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

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error:
          "GEMINI_API_KEY لە Vercel Environment Variables دانەنراوە."
      });
    }

    // =======================================================
    // USER REQUEST
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

    if (!message && !image) {
      return res.status(400).json({
        success: false,
        error:
          "تکایە پرسیار یان وێنەی Chart بنێرە."
      });
    }

    // =======================================================
    // BACKEND URL
    // =======================================================

    const baseUrl =
      process.env.SHAHANFX_BACKEND_URL ||
      "https://shahanfx-backend-9576.vercel.app";

    // =======================================================
    // LIVE MARKET DATA
    // =======================================================

    let marketData = null;

    try {

      const marketUrl =
        `${baseUrl}/api/market` +
        `?symbol=${encodeURIComponent(symbol)}` +
        `&interval=${encodeURIComponent(interval)}` +
        `&outputsize=100`;

      const marketResponse =
        await fetch(marketUrl);

      const marketJson =
        await marketResponse.json();

      if (marketResponse.ok && marketJson?.success) {
        marketData = marketJson;
      }

    } catch (marketError) {

      console.error(
        "Market API Error:",
        marketError
      );

    }

    // =======================================================
    // LIVE NEWS DATA
    // =======================================================

    let newsData = null;

    try {

      const newsUrl =
        `${baseUrl}/api/news`;

      const newsResponse =
        await fetch(newsUrl);

      const newsJson =
        await newsResponse.json();

      if (newsResponse.ok && newsJson?.success) {
        newsData = newsJson;
      }

    } catch (newsError) {

      console.error(
        "News API Error:",
        newsError
      );

    }

    // =======================================================
    // MARKET CONTEXT
    // =======================================================

    let marketContext =
      "LIVE MARKET DATA بەردەست نییە.";

    if (marketData) {

      const market =
        marketData.market || {};

      const candles =
        Array.isArray(marketData.candles)
          ? marketData.candles
          : [];

      marketContext = `
LIVE MARKET DATA

Source:
${marketData.source || "Unknown"}

Symbol:
${marketData.symbol || symbol}

Interval:
${marketData.interval || interval}

Current Price:
${market.currentPrice ?? "N/A"}

Direction:
${market.direction || "neutral"}

Current Candle:
${JSON.stringify(
  market.currentCandle || null
)}

Previous Candle:
${JSON.stringify(
  market.previousCandle || null
)}

Recent Candles:
${JSON.stringify(
  candles.slice(0, 50)
)}
`;

    }

    // =======================================================
    // NEWS CONTEXT
    // =======================================================

    let newsContext =
      "LIVE NEWS DATA بەردەست نییە.";

    if (newsData) {

      newsContext = `
LIVE NEWS / ECONOMIC DATA

${JSON.stringify(
  newsData,
  null,
  2
)}
`;

    }

    // =======================================================
    // SHAHANFX SYSTEM PROMPT
    // =======================================================

    const systemPrompt = `

تۆ ShahanFX AI Pro ـیت.

تۆ ڕاوێژکاری زیرەکی پیشەیی بۆ:

Forex
ICT
SMC
Price Action
Market Structure
Technical Analysis
Fundamental Analysis
Economic News
Chart Analysis
Risk Management

=========================================================
LANGUAGE
=========================================================

بە زمانی کوردی سۆرانی وەڵام بدە.

وەڵامەکان:

ڕوون
کورت بەڵام پڕ لە زانیاری
پیشەیی
ڕێکخراو
ئاسان بۆ تێگەیشتن

=========================================================
LIVE DATA RULE
=========================================================

ئەگەر LIVE MARKET DATA بەردەستە:

لە شیکردنەوەکەتدا بەکاری بهێنە.

ئەگەر LIVE NEWS DATA بەردەستە:

هەواڵەکان لەگەڵ market reaction پەیوەندیدار بکە.

بەڵام:

هیچ price ـێکی ساختە دروست مەکە.

هیچ news ـێکی ساختە دروست مەکە.

هیچ current market condition ـێکی خۆت مەخەڵقە.

ئەگەر data بەردەست نییە:

بە ڕوونی بڵێ.

=========================================================
FOREX
=========================================================

شارەزایی لە:

XAUUSD
EURUSD
GBPUSD
USDJPY
USDCHF
AUDUSD
USDCAD
NZDUSD

Pips
Spread
Leverage
Lot Size
Position Size
Risk
Stop Loss
Take Profit
Risk Reward
Volatility
Momentum

=========================================================
ICT
=========================================================

Liquidity
BSL
SSL
Liquidity Sweep
Liquidity Grab

FVG
IFVG

Order Block
Breaker Block
Mitigation Block

Premium
Discount
Equilibrium

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

HH
HL
LH
LL

BOS
CHOCH

Liquidity
FVG
Order Block
Breaker
Mitigation

Supply
Demand

Premium
Discount

=========================================================
CANDLE ANALYSIS
=========================================================

لە market data ـی candle ـەکاندا:

Open
High
Low
Close

بپشکنە.

لەوانەیە:

Bullish candle
Bearish candle
Engulfing
Pin Bar
Doji
Rejection
Displacement

دیاری بکە.

بەڵام هیچ pattern ـێک مەڵێ ئەگەر داتا پشتگیری نەکات.

=========================================================
NEWS ANALYSIS
=========================================================

ئەگەر هەواڵی گرنگ هەیە:

CPI
NFP
FOMC
Interest Rate
PPI
GDP
Unemployment
Retail Sales
PMI
Powell Speech

ئەم شتانە هەڵسەنگێنە:

1. News
2. Expected
3. Actual
4. Previous
5. Potential impact
6. Market reaction

بەتایبەتی بۆ:

XAUUSD
USD pairs

پەیوەندی هەواڵ و جووڵەی market ڕوون بکەوە.

=========================================================
NEWS + CANDLE
=========================================================

ئەگەر هەواڵی گرنگ لە هەمان کاتدا market move ـێکی توند دروست کردووە:

هەردووکیان پێکەوە شیکاربکە:

NEWS
+
CANDLE
+
LIQUIDITY
+
MARKET STRUCTURE

نموونە:

CPI دەرچوو.

Market displacement کرد.

Liquidity sweep ڕوویدا.

دواتر BOS/CHOCH ڕوویدا.

ئەم chain ـە شیکاربکە.

بەڵام هەموو شتێک تەنها ئەگەر داتا پشتگیری بکات.

=========================================================
CHART IMAGE
=========================================================

ئەگەر بەکارهێنەر image نارد:

وێنەکە شیکاربکە.

هەوڵ بدە دیاری بکەیت:

Symbol
Timeframe
Price
Trend

HH
HL
LH
LL

BOS
CHOCH

Liquidity
BSL
SSL
Liquidity Sweep

FVG
Order Block
Breaker Block

Premium
Discount

Support
Resistance

Candlestick confirmation

هیچ شتێک مەخەڵقە.

ئەگەر دیار نییە:

"ئەم زانیارییە لە وێنەکەدا بە دڵنیایی دیار نییە."

=========================================================
ANALYSIS ORDER
=========================================================

هەمیشە ئەم ڕیزبەندییە بەکاربهێنە:

1. Market Context
2. News
3. Price
4. Trend
5. Market Structure
6. Liquidity
7. BOS / CHOCH
8. FVG
9. Order Block
10. Candle Reaction
11. Setup
12. Invalidation
13. Risk/Reward
14. Final Decision

=========================================================
TRADE SETUP
=========================================================

ئەگەر داتا بەسە:

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

⚠️ Risk:
...

=========================================================
CONFIDENCE
=========================================================

هیچ کاتێک:

100% Guaranteed
100% Win
Guaranteed Profit

مەڵێ.

Confidence تەنها هەڵسەنگاندنی AI ـە.

=========================================================
RISK
=========================================================

ئەگەر Balance و Risk % نەدراوە:

Lot Size ـی ورد مەدەرە.

بڵێ:

"بۆ Lot Size ـی ورد Balance و Risk % پێویستە."

=========================================================
WAIT RULE
=========================================================

ئەگەر confirmation لاوازە:

WAIT

ئەگەر market ناڕوونە:

WAIT

ئەگەر news volatility زۆرە:

WAIT FOR CONFIRMATION

ئەگەر data نییە:

REQUEST LIVE DATA

=========================================================
IMPORTANT
=========================================================

Forex و CFD مەترسیدارن.

هیچ trade ـێک 100% دڵنیایی نییە.

ئامانج:

Analysis
Education
Risk Management

نەک Guaranteed Profit.

`;

    // =======================================================
    // USER CONTEXT
    // =======================================================

    const userText = `

=========================================================
USER QUESTION
=========================================================

${message || "تکایە Chart ـەکە شیکاربکە."}

=========================================================
${marketContext}

=========================================================
${newsContext}

=========================================================
FINAL TASK

لەسەر هەموو ئەو data ـانەی بەردەستە
وەڵامی بەکارهێنەر بدە.

NEWS + MARKET + CANDLE + ICT + SMC

پێکەوە هەڵسەنگێنە.

ئەگەر data کەمە،
داتای ساختە دروست مەکە.
`;

    // =======================================================
    // GEMINI PARTS
    // =======================================================

    const parts = [
      {
        text:
          systemPrompt +
          "\n\n" +
          userText
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

    // =======================================================
    // RETRY
    // =======================================================

    const MAX_RETRIES = 2;

    const BASE_DELAY = 1500;

    let finalResponse = null;
    let finalData = null;
    let usedModel = null;

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
                      parts
                    }
                  ],

                  generationConfig: {

                    maxOutputTokens: 5000,

                    thinkingConfig: {
                      thinkingLevel: "medium"
                    }

                  }

                })
              }
            );

          const data =
            await response.json();

          finalResponse = response;
          finalData = data;

          // =================================================
          // SUCCESS
          // =================================================

          if (response.ok) {

            usedModel = model;

            break outerLoop;

          }

          // =================================================
          // ERROR
          // =================================================

          const errorMessage =
            String(
              data?.error?.message ||
              ""
            );

          const lowerError =
            errorMessage.toLowerCase();

          console.error(
            `Gemini ${model} error:`,
            data
          );

          // =================================================
          // RETRYABLE
          // =================================================

          const retryable =
            response.status === 429 ||
            response.status === 500 ||
            response.status === 502 ||
            response.status === 503 ||
            response.status === 504 ||
            lowerError.includes("high demand") ||
            lowerError.includes("overloaded") ||
            lowerError.includes("temporarily unavailable") ||
            lowerError.includes("resource exhausted");

          if (!retryable) {

            break outerLoop;

          }

          // =================================================
          // WAIT
          // =================================================

          if (
            attempt <
            MAX_RETRIES - 1
          ) {

            const delay =
              BASE_DELAY *
              Math.pow(2, attempt);

            await new Promise(
              resolve =>
                setTimeout(
                  resolve,
                  delay
                )
            );

          }

        } catch (error) {

          console.error(
            `Network error ${model}:`,
            error
          );

          if (
            attempt <
            MAX_RETRIES - 1
          ) {

            const delay =
              BASE_DELAY *
              Math.pow(2, attempt);

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
    // FAILED
    // =======================================================

    if (
      !finalResponse ||
      !finalResponse.ok ||
      !usedModel
    ) {

      const errorMessage =
        finalData?.error?.message ||
        "Unknown Gemini error";

      console.error(
        "SHAHANFX GEMINI FINAL ERROR:",
        finalData
      );

      return res.status(503).json({

        success: false,

        error:
          "⚠️ ShahanFX AI لە ئێستادا وەڵام ناداتەوە.",

        details:
          errorMessage,

        marketAvailable:
          Boolean(marketData),

        newsAvailable:
          Boolean(newsData)

      });

    }

    // =======================================================
    // EXTRACT ANSWER
    // =======================================================

    const answer =
      finalData
        ?.candidates?.[0]
        ?.content
        ?.parts
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

      liveData: {

        market:
          Boolean(marketData),

        news:
          Boolean(newsData)

      }

    });

  } catch (error) {

    console.error(
      "SHAHANFX SERVER ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      error:
        "هەڵەی ناوخۆی ShahanFX Backend ڕوویدا.",

      details:
        error?.message || null

    });

  }

}
