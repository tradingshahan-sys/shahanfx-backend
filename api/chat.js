export default async function handler(req, res) {
  // =========================================================
  // SHAHANFX AI PRO
  // LIVE MARKET + ECONOMIC NEWS + GEMINI
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
    // API KEYS
    // =======================================================

    const geminiKey = process.env.GEMINI_API_KEY;
    const twelveKey = process.env.TWELVE_DATA_API_KEY;
    const fmpKey = process.env.FMP_API_KEY;

    if (!geminiKey) {
      return res.status(500).json({
        success: false,
        error: "GEMINI_API_KEY لە Vercel دانەنراوە."
      });
    }

    // =======================================================
    // USER INPUT
    // =======================================================

    const body = req.body || {};

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const image = body.image || null;

    const symbolInput =
      body.symbol || "XAU/USD";

    const intervalInput =
      body.interval || "5min";

    if (!message && !image) {
      return res.status(400).json({
        success: false,
        error: "تکایە پرسیار یان وێنەی Chart بنێرە."
      });
    }

    // =======================================================
    // SYMBOL
    // =======================================================

    const symbolMap = {
      XAUUSD: "XAU/USD",
      GOLD: "XAU/USD",
      "XAU/USD": "XAU/USD",

      EURUSD: "EUR/USD",
      "EUR/USD": "EUR/USD",

      GBPUSD: "GBP/USD",
      "GBP/USD": "GBP/USD",

      USDJPY: "USD/JPY",
      "USD/JPY": "USD/JPY",

      USDCHF: "USD/CHF",
      "USD/CHF": "USD/CHF",

      AUDUSD: "AUD/USD",
      "AUD/USD": "AUD/USD",

      USDCAD: "USD/CAD",
      "USD/CAD": "USD/CAD",

      NZDUSD: "NZD/USD",
      "NZD/USD": "NZD/USD"
    };

    const symbol =
      symbolMap[String(symbolInput).toUpperCase()] ||
      "XAU/USD";

    // =======================================================
    // INTERVAL
    // =======================================================

    const allowedIntervals = [
      "1min",
      "5min",
      "15min",
      "30min",
      "45min",
      "1h",
      "2h",
      "4h",
      "8h",
      "1day"
    ];

    const interval =
      allowedIntervals.includes(intervalInput)
        ? intervalInput
        : "5min";

    // =======================================================
    // DATE — IRAQ/BAGHDAD
    // =======================================================

    const now = new Date();

    const today =
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Baghdad",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(now);

    // =======================================================
    // LIVE MARKET DATA
    // =======================================================

    let marketData = {
      success: false,
      source: "Twelve Data",
      symbol,
      interval,
      candles: [],
      market: {
        currentPrice: null,
        direction: "neutral"
      }
    };

    if (twelveKey) {
      try {
        const marketUrl = new URL(
          "https://api.twelvedata.com/time_series"
        );

        marketUrl.searchParams.set("symbol", symbol);
        marketUrl.searchParams.set("interval", interval);
        marketUrl.searchParams.set("outputsize", "100");
        marketUrl.searchParams.set("order", "desc");
        marketUrl.searchParams.set("apikey", twelveKey);

        const response =
          await fetch(marketUrl.toString());

        const data =
          await response.json();

        if (response.ok && !data?.status?.toString().toLowerCase().includes("error")) {

          const values =
            Array.isArray(data?.values)
              ? data.values
              : [];

          const candles =
            values.map(c => ({
              datetime: c.datetime || null,
              open: Number(c.open),
              high: Number(c.high),
              low: Number(c.low),
              close: Number(c.close),
              volume:
                c.volume !== undefined
                  ? Number(c.volume)
                  : null
            }));

          const current = candles[0] || null;
          const previous = candles[1] || null;

          let direction = "neutral";

          if (current && previous) {
            if (current.close > previous.close) {
              direction = "bullish";
            } else if (current.close < previous.close) {
              direction = "bearish";
            }
          }

          marketData = {
            success: true,
            source: "Twelve Data",
            symbol,
            interval,

            market: {
              currentPrice:
                current?.close ?? null,

              direction,

              currentCandle:
                current || null,

              previousCandle:
                previous || null
            },

            candles,

            meta:
              data?.meta || null
          };
        } else {
          console.error(
            "Twelve Data Error:",
            data
          );
        }

      } catch (error) {
        console.error(
          "Market Engine Error:",
          error
        );
      }
    }

    // =======================================================
    // ECONOMIC NEWS — FMP
    // =======================================================

    let newsData = {
      success: false,
      source: "Financial Modeling Prep",
      events: [],
      importantNews: [],
      cpi: [],
      nfp: [],
      fomc: [],
      ppi: []
    };

    if (fmpKey) {
      try {
        const newsUrl = new URL(
          "https://financialmodelingprep.com/stable/economic-calendar"
        );

        newsUrl.searchParams.set("from", today);
        newsUrl.searchParams.set("to", today);
        newsUrl.searchParams.set("apikey", fmpKey);

        const response =
          await fetch(newsUrl.toString(), {
            headers: {
              Accept: "application/json"
            }
          });

        const data =
          await response.json();

        if (response.ok && Array.isArray(data)) {

          const usEvents =
            data.filter(event => {
              const country =
                String(
                  event?.country || ""
                ).toUpperCase();

              return (
                country === "US" ||
                country === "USA" ||
                country === "UNITED STATES"
              );
            });

          const importantKeywords = [
            "CPI",
            "Consumer Price Index",
            "Non Farm Payrolls",
            "Non-Farm Payrolls",
            "Nonfarm Payrolls",
            "NFP",
            "Federal Funds Rate",
            "Interest Rate",
            "FOMC",
            "PPI",
            "Producer Price Index",
            "GDP",
            "Gross Domestic Product",
            "Unemployment Rate",
            "Initial Jobless Claims",
            "Retail Sales",
            "ISM Manufacturing",
            "ISM Services",
            "PMI",
            "Powell",
            "Federal Reserve",
            "Fed"
          ];

          const normalizeEvent = event => ({
            date:
              event?.date || null,

            country:
              event?.country || null,

            event:
              event?.event ||
              event?.name ||
              null,

            impact:
              event?.impact ??
              event?.importance ??
              null,

            actual:
              event?.actual ??
              null,

            forecast:
              event?.estimate ??
              event?.forecast ??
              null,

            previous:
              event?.previous ??
              null,

            unit:
              event?.unit ||
              null,

            currency:
              event?.currency ||
              null
          });

          const normalized =
            usEvents.map(normalizeEvent);

          const importantNews =
            normalized.filter(event => {
              const name =
                String(event.event || "")
                  .toLowerCase();

              return importantKeywords.some(
                keyword =>
                  name.includes(
                    keyword.toLowerCase()
                  )
              );
            });

          const cpi =
            importantNews.filter(event => {
              const name =
                String(event.event || "")
                  .toLowerCase();

              return (
                name.includes("cpi") ||
                name.includes(
                  "consumer price index"
                )
              );
            });

          const nfp =
            importantNews.filter(event => {
              const name =
                String(event.event || "")
                  .toLowerCase();

              return (
                name.includes("non farm") ||
                name.includes("non-farm") ||
                name.includes("nonfarm") ||
                name.includes("payroll") ||
                name === "nfp"
              );
            });

          const fomc =
            importantNews.filter(event => {
              const name =
                String(event.event || "")
                  .toLowerCase();

              return (
                name.includes("fomc") ||
                name.includes("federal funds") ||
                name.includes("interest rate")
              );
            });

          const ppi =
            importantNews.filter(event => {
              const name =
                String(event.event || "")
                  .toLowerCase();

              return (
                name.includes("ppi") ||
                name.includes("producer price")
              );
            });

          newsData = {
            success: true,
            source: "Financial Modeling Prep",

            events: normalized,

            importantNews,

            cpi,
            nfp,
            fomc,
            ppi
          };
        } else {
          console.error(
            "FMP Error:",
            data
          );
        }

      } catch (error) {
        console.error(
          "News Engine Error:",
          error
        );
      }
    }

    // =======================================================
    // MARKET VALUES
    // =======================================================

    const candles =
      marketData?.candles || [];

    const currentPrice =
      marketData?.market?.currentPrice ??
      null;

    const direction =
      marketData?.market?.direction ||
      "neutral";

    // =======================================================
    // NEWS VALUES
    // =======================================================

    const importantNews =
      newsData?.importantNews || [];

    const cpi =
      newsData?.cpi || [];

    const nfp =
      newsData?.nfp || [];

    const fomc =
      newsData?.fomc || [];

    const ppi =
      newsData?.ppi || [];

    // =======================================================
    // SYSTEM PROMPT
    // =======================================================

    const systemPrompt = `
تۆ ShahanFX AI Pro ـیت.

تۆ یارمەتیدەری پیشەیی بۆ:

Forex
XAU/USD
ICT
SMC
Price Action
Market Structure
Economic News
Chart Analysis
Risk Management

====================================================
یاسای زۆر گرنگ
====================================================

تەنها داتای Live ـی پێدراو بەکاربهێنە.

هیچ نرخێک مەخەڵقە.

هیچ هەواڵێک مەخەڵقە.

هیچ Actual / Forecast / Previous ـێک مەخەڵقە.

ئەگەر داتا نییە:
"داتای ڕاستەوخۆی ئەم بەشە بەردەست نییە."

بەڵام ئەگەر News Data بەردەستە، نابێت بڵێیت
News Data بەردەست نییە.

====================================================
زمان
====================================================

وەڵام بە کوردی سۆرانی بدە.

وشەکانی Forex / ICT / SMC دەتوانیت بە ئینگلیزی بەکاربهێنیت.

====================================================
CPI
====================================================

کاتێک بەکارهێنەر دەڵێت:

"CPI هەیە؟"
"هەواڵی CPI هەیە؟"
"CPI چییە؟"

تەنها CPI ـی Live Data بپشکنە.

ئەگەر CPI هەیە:

📰 CPI
📅 Date
⚡ Impact
💵 Currency
📊 Actual
📊 Forecast
📊 Previous

هەموویان تەنها ئەگەر لە DATA ـدا بوون پیشان بدە.

ئەگەر Actual بەردەست نییە:
"Actual: بەردەست نییە"

خۆت ژمارە دروست مەکە.

====================================================
NEWS + GOLD
====================================================

CPI دەتوانێت کاریگەری لەسەر USD و Gold هەبێت.

بەڵام هیچ Direction ـێک Guaranteed نییە.

News + Price Action پێکەوە شیکاربکە.

بپشکنە:

News Time
Price Before News
Price After News
Volatility
Displacement
Liquidity Sweep
BOS
CHOCH
FVG
Retest

====================================================
ICT / SMC
====================================================

بپشکنە:

HH
HL
LH
LL
BOS
CHOCH
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

هیچ level ـێک مەخەڵقە.
تەنها ئەو level ـانە بەکاربهێنە کە لە candle data ـەکە پشتگیری دەکرێن.

====================================================
TRADE SETUP
====================================================

ئەگەر confirmation نییە:

🎯 Setup: WAIT

هیچ Trade ـێک 100% guaranteed نییە.

ئەگەر News زۆر نزیکە یان volatility زۆر بەرزە:
WAIT.

ئەگەر Balance و Risk % نەدراوە:
Lot Size مەحسابە.

====================================================
FORMAT
====================================================

ئەگەر بەکارهێنەر داوای شیکاری کرد:

📊 SHAHANFX AI PRO

🥇 Symbol:
⏱ Timeframe:
💰 Current Price:

📰 News:
📊 Actual:
📊 Forecast:
📊 Previous:

⚡ News Impact:
📈 Market Bias:

🏗 Market Structure:
🔥 BOS / CHOCH:
💧 Liquidity:
📦 FVG:
🧱 Order Block:
🕯 Candle Reaction:

🎯 Setup:
📍 Entry:
🛑 Invalidation:
🎯 TP:
⚖️ Risk / Reward:
🧠 Confidence:

لە کۆتاییدا:
⚠️ Risk Warning
`;

    // =======================================================
    // LIVE CONTEXT
    // =======================================================

    const liveContext = `

================ LIVE MARKET ================

Source:
${marketData?.source || "Unavailable"}

Symbol:
${symbol}

Timeframe:
${interval}

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

================ LIVE NEWS ================

Source:
${newsData?.source || "Unavailable"}

Important News:
${JSON.stringify(
  importantNews,
  null,
  2
)}

================ CPI ================

${JSON.stringify(
  cpi,
  null,
  2
)}

================ NFP ================

${JSON.stringify(
  nfp,
  null,
  2
)}

================ FOMC ================

${JSON.stringify(
  fomc,
  null,
  2
)}

================ PPI ================

${JSON.stringify(
  ppi,
  null,
  2
)}

================ USER ================

${message || "ئەم Chart ـە شیکاربکە."}
`;

    // =======================================================
    // GEMINI CONTENT
    // =======================================================

    const parts = [
      {
        text:
          systemPrompt +
          "\n\n" +
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
          mimeType: image.mimeType,
          data: image.data
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

    let response = null;
    let data = null;
    let usedModel = null;

    // =======================================================
    // GEMINI REQUEST
    // =======================================================

    for (const model of models) {

      try {

        const endpoint =
          "https://generativelanguage.googleapis.com/v1beta/models/" +
          model +
          ":generateContent";

        response =
          await fetch(endpoint, {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": geminiKey
            },

            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts
                }
              ],

              generationConfig: {
                maxOutputTokens: 5000
              }
            })
          });

        data =
          await response.json();

        if (response.ok) {
          usedModel = model;
          break;
        }

        console.error(
          `Gemini ${model} failed:`,
          data
        );

      } catch (error) {

        console.error(
          `Gemini ${model} exception:`,
          error
        );

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

      return res.status(503).json({
        success: false,

        error:
          "⚠️ ShahanFX AI لە ئێستادا بەردەست نییە. تکایە دووبارە هەوڵ بدە.",

        debug: {
          marketConnected:
            Boolean(marketData?.success),

          newsConnected:
            Boolean(newsData?.success),

          gemini:
            false
        }
      });
    }

    // =======================================================
    // EXTRACT TEXT
    // =======================================================

    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.filter(part => typeof part.text === "string")
        ?.map(part => part.text)
        ?.join("")
        ?.trim();

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

        symbol,

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
          ppi.length,

        important:
          importantNews.length
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
        error?.message || null

    });
  }
}
