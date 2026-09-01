export default async function handler(req, res) {

  /*
   * =========================================================
   * SHAHANFX AI PRO — LIVE MARKET + NEWS ENGINE
   *
   * market.js  → Live Candles
   * news.js    → CPI / NFP / FOMC / PPI / GDP...
   * Gemini     → AI Analysis
   * Image      → Chart Vision
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
    // ENVIRONMENT VARIABLES
    // =======================================================

    const geminiKey =
      process.env.GEMINI_API_KEY;

    const twelveKey =
      process.env.TWELVE_DATA_API_KEY;

    const fmpKey =
      process.env.FMP_API_KEY;

    if (!geminiKey) {
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

    const image =
      body.image || null;

    const symbol =
      body.symbol || "XAU/USD";

    const interval =
      body.interval || "5min";

    if (!message && !image) {
      return res.status(400).json({
        success: false,
        error:
          "تکایە پرسیار یان وێنەی Chart بنێرە."
      });
    }

    // =======================================================
    // API BASE URL
    // =======================================================

    const host =
      req.headers.host;

    const protocol =
      req.headers["x-forwarded-proto"] || "https";

    const baseUrl =
      `${protocol}://${host}`;

    // =======================================================
    // LIVE MARKET DATA
    // =======================================================

    let marketData = null;

    if (twelveKey) {

      try {

        const marketUrl =
          new URL(
            `${baseUrl}/api/market`
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
            marketUrl.toString()
          );

        marketData =
          await marketResponse.json();

      } catch (error) {

        console.error(
          "Market Engine Error:",
          error
        );

        marketData = {
          success: false,
          error:
            "Live Market Data بەردەست نییە."
        };

      }

    } else {

      marketData = {
        success: false,
        error:
          "TWELVE_DATA_API_KEY دانەنراوە."
      };

    }

    // =======================================================
    // LIVE NEWS DATA
    // =======================================================

    let newsData = null;

    if (fmpKey) {

      try {

        const newsUrl =
          new URL(
            `${baseUrl}/api/news`
          );

        const today =
          new Date()
            .toISOString()
            .slice(0, 10);

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
            newsUrl.toString()
          );

        newsData =
          await newsResponse.json();

      } catch (error) {

        console.error(
          "News Engine Error:",
          error
        );

        newsData = {
          success: false,
          error:
            "News Data بەردەست نییە."
        };

      }

    } else {

      newsData = {
        success: false,
        error:
          "FMP_API_KEY دانەنراوە."
      };

    }

    // =======================================================
    // MARKET CANDLES
    // =======================================================

    const candles =
      Array.isArray(
        marketData?.candles
      )
        ? marketData.candles
        : [];

    const currentPrice =
      marketData?.market?.currentPrice
      ?? null;

    const direction =
      marketData?.market?.direction
      ?? "neutral";

    // =======================================================
    // IMPORTANT NEWS
    // =======================================================

    const importantNews =
      Array.isArray(
        newsData?.importantNews
      )
        ? newsData.importantNews
        : [];

    const cpi =
      Array.isArray(
        newsData?.cpi
      )
        ? newsData.cpi
        : [];

    const nfp =
      Array.isArray(
        newsData?.nfp
      )
        ? newsData.nfp
        : [];

    const fomc =
      Array.isArray(
        newsData?.fomc
      )
        ? newsData.fomc
        : [];

    const ppi =
      Array.isArray(
        newsData?.ppi
      )
        ? newsData.ppi
        : [];

    // =======================================================
    // SYSTEM PROMPT
    // =======================================================

    const systemPrompt = `

تۆ ShahanFX AI Pro ـیت.

تۆ ڕاوێژکاری زیرەکی بۆ:

Forex
XAU/USD
ICT
SMC
Price Action
Market Structure
Economic News
Chart Analysis
Risk Management

=========================================================
گرنگترین یاسا
=========================================================

تۆ ئێستا داتای Live Market و Live News ـت پێدراوە.

بۆیە:

هیچ Price ـێک مەخەڵقە.

هیچ News ـێک مەخەڵقە.

هیچ Actual / Forecast / Previous ـێک مەخەڵقە.

تەنها ئەو داتایە بەکاربهێنە کە لە LIVE DATA ـی خوارەوە هاتووە.

ئەگەر داتا بەردەست نەبوو:

بە ڕوونی بڵێ:

"داتای ڕاستەوخۆی ئەم بەشە بەردەست نییە."

=========================================================
زمان
=========================================================

وەڵام بە کوردی سۆرانی بدە.

وشە پیشەییەکانی Forex / ICT / SMC
دەتوانرێت بە ئینگلیزی لەگەڵ کوردی بەکاربهێنرێن.

=========================================================
LIVE MARKET
=========================================================

Live Market Data بەکاربهێنە بۆ:

Current Price
Direction
Candles
Open
High
Low
Close
Market Momentum
Volatility

بۆ شیکردنەوەی Structure:

HH
HL
LH
LL
BOS
CHOCH

=========================================================
ICT / SMC
=========================================================

بپشکنە:

Liquidity
BSL
SSL
Liquidity Sweep
FVG
Order Block
Breaker Block
Mitigation
Premium
Discount
Equilibrium
Displacement
Imbalance
BOS
CHOCH

=========================================================
NEWS ENGINE
=========================================================

Live News Data لە FMP ـەوە هاتووە.

بەتایبەتی:

CPI
NFP
FOMC
PPI
GDP
Interest Rate
Unemployment
Retail Sales
PMI
ISM

کاتێک بەکارهێنەر دەڵێت:

"CPI هەیە؟"

تەنها CPI data ـی LIVE بپشکنە.

ئەگەر CPI هەیە:

Actual
Forecast
Previous
Date
Impact
Currency

پیشان بدە.

=========================================================
NEWS + PRICE REACTION
=========================================================

ئەمە زۆر گرنگە:

News تەنها بە تەنیا شیکاری مەکە.

News + Price Action
پێکەوە شیکاربکە.

نموونە:

CPI Actual > Forecast

→ بە شێوەی گشتی دەتوانێت USD بەهێز بکات
→ زێڕ دەتوانێت فشارێکی نزولی ببینێت

بەڵام:

هیچ کاتێک ئەمە بە Guaranteed Direction مەڵێ.

دەبێت Candle Reaction پشتڕاستی بکاتەوە.

=========================================================
CANDLE + NEWS
=========================================================

ئەگەر News نزیک بە کاتی Candle Reaction بوو:

بپشکنە:

1. News Time
2. Candle Time
3. Price Before News
4. Price After News
5. Volatility
6. Displacement
7. Liquidity Sweep
8. BOS / CHOCH
9. FVG
10. Retest

ئەگەر هاوتەریب بوون:

بڵێ:

"News و Price Reaction لە یەک ئاڕاستەدان."

ئەگەر پێچەوانە بوون:

بڵێ:

"News و Price Reaction پێکەوە ناگونجێن؛ Confirmation پێویستە."

=========================================================
CHART IMAGE
=========================================================

ئەگەر وێنەی Chart هەیە:

Symbol
Timeframe
Price
Trend
Structure
Liquidity
FVG
Order Block
BOS
CHOCH
Candlestick

بپشکنە.

هیچ شتێک لە وێنەکەدا مەخەڵقە.

=========================================================
TRADE ANALYSIS
=========================================================

ئەگەر trade analysis داواکرا:

📊 SHAHANFX AI PRO

🥇 Symbol:
...

⏱ Timeframe:
...

💰 Current Price:
...

📰 News:
...

📊 Actual:
...

📊 Forecast:
...

📊 Previous:
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

⚖️ Risk / Reward:
...

🧠 Confidence:
Low / Medium / High

=========================================================
RISK
=========================================================

هیچ trade ـێک 100% Guaranteed نییە.

ئەگەر Balance و Risk % نەدراوە:

Lot Size مەحسابە.

بڵێ:

"بۆ دیاریکردنی Lot Size ـی ورد،
Balance و Risk % پێویستە."

=========================================================
WAIT
=========================================================

ئەگەر:

News زۆر نزیکە
یان
Volatility زۆر بەرزە
یان
Structure ناڕوونە
یان
Confirmation نییە

Setup:

WAIT

پێشنیاری چوونە ناو Trade بەبێ Confirmation مەدە.

`;

    // =======================================================
    // LIVE DATA CONTEXT
    // =======================================================

    const liveContext = `

=========================================================
LIVE MARKET DATA
=========================================================

Source:
${marketData?.source || "Unavailable"}

Symbol:
${marketData?.symbol || symbol}

Interval:
${marketData?.interval || interval}

Current Price:
${currentPrice ?? "Unavailable"}

Direction:
${direction}

Candles:

${JSON.stringify(
  candles.slice(0, 100),
  null,
  2
)}

=========================================================
LIVE NEWS DATA
=========================================================

News Source:
${newsData?.source || "Unavailable"}

Important News:

${JSON.stringify(
  importantNews,
  null,
  2
)}

=========================================================
CPI
=========================================================

${JSON.stringify(
  cpi,
  null,
  2
)}

=========================================================
NFP
=========================================================

${JSON.stringify(
  nfp,
  null,
  2
)}

=========================================================
FOMC
=========================================================

${JSON.stringify(
  fomc,
  null,
  2
)}

=========================================================
PPI
=========================================================

${JSON.stringify(
  ppi,
  null,
  2
)}

=========================================================
USER REQUEST
=========================================================

${message || "ئەم Chart ـە شیکاربکە."}

`;

    // =======================================================
    // GEMINI PARTS
    // =======================================================

    const parts = [
      {
        text:
          systemPrompt +
          liveContext
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
    // GEMINI MODELS
    // =======================================================

    const models = [
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash"
    ];

    const MAX_RETRIES = 2;

    const BASE_DELAY = 1200;

    let response = null;
    let data = null;
    let usedModel = null;

    // =======================================================
    // GEMINI REQUEST
    // =======================================================

    outerLoop:

    for (const model of models) {

      for (
        let attempt = 0;
        attempt < MAX_RETRIES;
        attempt++
      ) {

        const endpoint =
          "https://generativelanguage.googleapis.com/v1beta/models/" +
          model +
          ":generateContent?key=" +
          encodeURIComponent(geminiKey);

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
                      maxOutputTokens: 5000,

                      temperature: 0.2,

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

          if (response.ok) {

            usedModel =
              model;

            break outerLoop;

          }

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
            errorText.includes("unavailable") ||
            errorText.includes("resource exhausted");

          if (!retryable) {
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

        } catch (error) {

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
    // GEMINI FAILED
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
          "⚠️ ShahanFX AI لە ئێستادا بەهۆی زۆری داواکارییەکانەوە بەردەست نییە. تکایە دووبارە هەوڵ بدە.",

        marketConnected:
          Boolean(
            marketData?.success
          ),

        newsConnected:
          Boolean(
            newsData?.success
          )

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
          Boolean(
            marketData?.success
          ),

        news:
          Boolean(
            newsData?.success
          )

      },

      market: {

        symbol:
          marketData?.symbol ||
          symbol,

        interval:
          marketData?.interval ||
          interval,

        currentPrice,

        direction

      },

      news: {

        cpi:
          cpi.length,

        nfp:
          nfp.length,

        fomc:
          fomc.length,

        ppi:
          ppi.length

      }

    });

  } catch (error) {

    console.error(
      "SHAHANFX AI PRO ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      error:
        "هەڵەی ناوخۆی ShahanFX AI Pro ڕوویدا.",

      details:
        error?.message ||
        null

    });

  }

}
