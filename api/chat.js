export default async function handler(req, res) {
  // =========================================================
  // SHAHANFX AI PRO — UNIFIED ENGINE
  //
  // ONE FILE:
  // AI + MARKET + NEWS + CPI + NFP + FOMC + PPI
  //
  // POST /api/chat
  // GET  /api/chat?action=market
  // GET  /api/chat?action=news
  // GET  /api/chat?action=cpi
  // =========================================================

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // =======================================================
    // ENV
    // =======================================================

    const geminiKey =
      process.env.GEMINI_API_KEY;

    const twelveKey =
      process.env.TWELVE_DATA_API_KEY;

    const fmpKey =
      process.env.FMP_API_KEY;

    // =======================================================
    // DATE — IRAQ / BAGHDAD
    // =======================================================

    const now = new Date();

    const baghdadDate = new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Asia/Baghdad",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }
    ).format(now);

    // =======================================================
    // DATE ADDER
    // =======================================================

    function addDays(dateString, days) {
      const d = new Date(
        `${dateString}T00:00:00Z`
      );

      d.setUTCDate(
        d.getUTCDate() + days
      );

      return d.toISOString().slice(0, 10);
    }

    // =======================================================
    // SYMBOL NORMALIZER
    // =======================================================

    function normalizeSymbol(input) {
      const value =
        String(input || "XAU/USD")
          .trim()
          .toUpperCase();

      const map = {
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

      return map[value] || "XAU/USD";
    }

    // =======================================================
    // INTERVAL
    // =======================================================

    function normalizeInterval(input) {
      const allowed = [
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

      return allowed.includes(input)
        ? input
        : "5min";
    }

    // =======================================================
    // GET INPUT
    // =======================================================

    const query =
      req.query || {};

    const action =
      String(
        query.action || ""
      ).toLowerCase();

    // =======================================================
    // MARKET ENGINE
    // =======================================================

    async function getMarketData(
      symbol = "XAU/USD",
      interval = "5min"
    ) {
      if (!twelveKey) {
        return {
          success: false,
          source: "Twelve Data",
          error:
            "TWELVE_DATA_API_KEY لە Vercel دانەنراوە.",
          candles: [],
          market: {
            currentPrice: null,
            direction: "neutral"
          }
        };
      }

      try {
        const url = new URL(
          "https://api.twelvedata.com/time_series"
        );

        url.searchParams.set(
          "symbol",
          normalizeSymbol(symbol)
        );

        url.searchParams.set(
          "interval",
          normalizeInterval(interval)
        );

        url.searchParams.set(
          "outputsize",
          "100"
        );

        url.searchParams.set(
          "order",
          "desc"
        );

        url.searchParams.set(
          "apikey",
          twelveKey
        );

        const response =
          await fetch(
            url.toString(),
            {
              headers: {
                Accept:
                  "application/json"
              }
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          data?.status === "error"
        ) {
          return {
            success: false,
            source: "Twelve Data",
            error:
              data?.message ||
              "Twelve Data هەڵەیەکی گەڕاندەوە.",
            candles: [],
            market: {
              currentPrice: null,
              direction: "neutral"
            }
          };
        }

        const values =
          Array.isArray(data?.values)
            ? data.values
            : [];

        const candles =
          values.map(c => ({
            datetime:
              c?.datetime || null,

            open:
              Number(c?.open),

            high:
              Number(c?.high),

            low:
              Number(c?.low),

            close:
              Number(c?.close),

            volume:
              c?.volume !== undefined
                ? Number(c.volume)
                : null
          }));

        const current =
          candles[0] || null;

        const previous =
          candles[1] || null;

        let direction =
          "neutral";

        if (
          current &&
          previous
        ) {
          if (
            current.close >
            previous.close
          ) {
            direction =
              "bullish";
          }

          if (
            current.close <
            previous.close
          ) {
            direction =
              "bearish";
          }
        }

        return {
          success: true,

          source:
            "Twelve Data",

          symbol:
            normalizeSymbol(symbol),

          interval:
            normalizeInterval(interval),

          timestamp:
            new Date().toISOString(),

          market: {
            currentPrice:
              current?.close ?? null,

            direction,

            currentCandle:
              current,

            previousCandle:
              previous
          },

          candles,

          meta:
            data?.meta || null
        };

      } catch (error) {
        console.error(
          "MARKET ENGINE:",
          error
        );

        return {
          success: false,
          source:
            "Twelve Data",
          error:
            "Live Market Data بەردەست نییە.",
          candles: [],
          market: {
            currentPrice: null,
            direction: "neutral"
          }
        };
      }
    }

    // =======================================================
    // NEWS NORMALIZER
    // =======================================================

    function normalizeEvent(event) {
      return {
        date:
          event?.date ||
          event?.datetime ||
          null,

        country:
          event?.country ||
          null,

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
          event?.consensus ??
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
      };
    }

    // =======================================================
    // NEWS ENGINE
    // =======================================================

    async function getNewsData(
      startDate = baghdadDate,
      endDate = addDays(
        baghdadDate,
        7
      )
    ) {
      if (!fmpKey) {
        return {
          success: false,
          source:
            "Financial Modeling Prep",
          error:
            "FMP_API_KEY لە Vercel دانەنراوە.",
          events: [],
          importantNews: [],
          cpi: [],
          nfp: [],
          fomc: [],
          ppi: [],
          gdp: []
        };
      }

      try {
        const url = new URL(
          "https://financialmodelingprep.com/stable/economic-calendar"
        );

        url.searchParams.set(
          "from",
          startDate
        );

        url.searchParams.set(
          "to",
          endDate
        );

        url.searchParams.set(
          "apikey",
          fmpKey
        );

        const response =
          await fetch(
            url.toString(),
            {
              headers: {
                Accept:
                  "application/json"
              }
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          return {
            success: false,
            source:
              "Financial Modeling Prep",
            error:
              data?.message ||
              "FMP API هەڵەیەکی گەڕاندەوە.",
            events: [],
            importantNews: [],
            cpi: [],
            nfp: [],
            fomc: [],
            ppi: [],
            gdp: []
          };
        }

        if (
          data &&
          !Array.isArray(data) &&
          data.error
        ) {
          return {
            success: false,
            source:
              "Financial Modeling Prep",
            error:
              data.error,
            events: [],
            importantNews: [],
            cpi: [],
            nfp: [],
            fomc: [],
            ppi: [],
            gdp: []
          };
        }

        const rawEvents =
          Array.isArray(data)
            ? data
            : [];

        // ---------------------------------------------------
        // US ONLY
        // ---------------------------------------------------

        const usEvents =
          rawEvents.filter(event => {
            const country =
              String(
                event?.country || ""
              )
                .trim()
                .toUpperCase();

            return (
              country === "US" ||
              country === "USA" ||
              country ===
                "UNITED STATES"
            );
          });

        const normalized =
          usEvents.map(
            normalizeEvent
          );

        // ---------------------------------------------------
        // KEYWORD HELPERS
        // ---------------------------------------------------

        function eventName(event) {
          return String(
            event?.event || ""
          ).toLowerCase();
        }

        function isCPI(event) {
          const name =
            eventName(event);

          return (
            name.includes("cpi") ||
            name.includes(
              "consumer price index"
            ) ||
            name.includes(
              "consumer prices"
            )
          );
        }

        function isNFP(event) {
          const name =
            eventName(event);

          return (
            name.includes(
              "non farm"
            ) ||
            name.includes(
              "non-farm"
            ) ||
            name.includes(
              "nonfarm"
            ) ||
            name.includes(
              "payroll"
            )
          );
        }

        function isFOMC(event) {
          const name =
            eventName(event);

          return (
            name.includes("fomc") ||
            name.includes(
              "federal funds"
            ) ||
            name.includes(
              "interest rate"
            ) ||
            name.includes(
              "fed interest"
            )
          );
        }

        function isPPI(event) {
          const name =
            eventName(event);

          return (
            name.includes("ppi") ||
            name.includes(
              "producer price"
            )
          );
        }

        function isGDP(event) {
          const name =
            eventName(event);

          return (
            name.includes("gdp") ||
            name.includes(
              "gross domestic product"
            )
          );
        }

        // ---------------------------------------------------
        // IMPORTANT
        // ---------------------------------------------------

        const importantKeywords = [
          "cpi",
          "consumer price",
          "non farm",
          "non-farm",
          "nonfarm",
          "payroll",
          "fomc",
          "federal funds",
          "interest rate",
          "ppi",
          "producer price",
          "gdp",
          "gross domestic product",
          "unemployment",
          "jobless claims",
          "retail sales",
          "ism",
          "pmi",
          "powell",
          "federal reserve",
          "fed"
        ];

        const importantNews =
          normalized.filter(
            event => {
              const name =
                eventName(event);

              return importantKeywords.some(
                keyword =>
                  name.includes(keyword)
              );
            }
          );

        // ---------------------------------------------------
        // SPECIAL NEWS
        // ---------------------------------------------------

        const cpi =
          normalized.filter(
            isCPI
          );

        const nfp =
          normalized.filter(
            isNFP
          );

        const fomc =
          normalized.filter(
            isFOMC
          );

        const ppi =
          normalized.filter(
            isPPI
          );

        const gdp =
          normalized.filter(
            isGDP
          );

        // ---------------------------------------------------
        // HIGH IMPACT
        // ---------------------------------------------------

        const highImpact =
          normalized.filter(
            event => {
              const impact =
                String(
                  event?.impact || ""
                ).toLowerCase();

              return (
                impact.includes("high") ||
                impact === "3" ||
                impact.includes(
                  "3"
                )
              );
            }
          );

        return {
          success: true,

          source:
            "Financial Modeling Prep",

          timestamp:
            new Date().toISOString(),

          range: {
            from: startDate,
            to: endDate
          },

          summary: {
            totalUSEvents:
              normalized.length,

            importantEvents:
              importantNews.length,

            highImpactEvents:
              highImpact.length,

            cpi:
              cpi.length,

            nfp:
              nfp.length,

            fomc:
              fomc.length,

            ppi:
              ppi.length,

            gdp:
              gdp.length
          },

          events:
            normalized,

          importantNews,

          highImpact,

          cpi,

          nfp,

          fomc,

          ppi,

          gdp
        };

      } catch (error) {
        console.error(
          "NEWS ENGINE:",
          error
        );

        return {
          success: false,
          source:
            "Financial Modeling Prep",
          error:
            "News Engine بەردەست نییە.",
          events: [],
          importantNews: [],
          cpi: [],
          nfp: [],
          fomc: [],
          ppi: [],
          gdp: []
        };
      }
    }

    // =======================================================
    // GET ENDPOINTS
    // =======================================================

    if (req.method === "GET") {

      const symbol =
        normalizeSymbol(
          query.symbol
        );

      const interval =
        normalizeInterval(
          query.interval
        );

      // ---------------------------------------------------
      // /api/chat?action=market
      // ---------------------------------------------------

      if (action === "market") {

        const market =
          await getMarketData(
            symbol,
            interval
          );

        return res.status(
          market.success
            ? 200
            : 502
        ).json(market);
      }

      // ---------------------------------------------------
      // /api/chat?action=cpi
      // ---------------------------------------------------

      if (action === "cpi") {

        const news =
          await getNewsData(
            baghdadDate,
            addDays(
              baghdadDate,
              14
            )
          );

        return res.status(
          news.success
            ? 200
            : 502
        ).json({
          success:
            news.success,

          source:
            news.source,

          range:
            news.range,

          cpi:
            news.cpi,

          count:
            news.cpi?.length || 0,

          error:
            news.error || null
        });
      }

      // ---------------------------------------------------
      // /api/chat?action=news
      // ---------------------------------------------------

      if (action === "news") {

        const news =
          await getNewsData(
            baghdadDate,
            addDays(
              baghdadDate,
              7
            )
          );

        return res.status(
          news.success
            ? 200
            : 502
        ).json(news);
      }

      return res.status(200).json({
        success: true,
        service:
          "ShahanFX AI Pro Unified Engine",
        endpoints: {
          ai:
            "POST /api/chat",
          market:
            "GET /api/chat?action=market",
          news:
            "GET /api/chat?action=news",
          cpi:
            "GET /api/chat?action=cpi"
        },
        status: {
          gemini:
            Boolean(geminiKey),
          market:
            Boolean(twelveKey),
          news:
            Boolean(fmpKey)
        }
      });
    }

    // =======================================================
    // POST — AI
    // =======================================================

    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        error:
          "تەنها GET یان POST ڕێگەپێدراوە."
      });
    }

    // =======================================================
    // GEMINI KEY
    // =======================================================

    if (!geminiKey) {
      return res.status(500).json({
        success: false,
        error:
          "GEMINI_API_KEY لە Vercel Environment Variables دانەنراوە."
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
      normalizeSymbol(
        body.symbol ||
        "XAU/USD"
      );

    const interval =
      normalizeInterval(
        body.interval ||
        "5min"
      );

    if (
      !message &&
      !image
    ) {
      return res.status(400).json({
        success: false,
        error:
          "تکایە پرسیار یان وێنەی Chart بنێرە."
      });
    }

    // =======================================================
    // LOAD LIVE DATA IN PARALLEL
    // =======================================================

    const [
      marketData,
      newsData
    ] = await Promise.all([
      getMarketData(
        symbol,
        interval
      ),

      // IMPORTANT:
      // Today + 14 days
      // so upcoming CPI is not missed.
      getNewsData(
        baghdadDate,
        addDays(
          baghdadDate,
          14
        )
      )
    ]);

    // =======================================================
    // MARKET
    // =======================================================

    const candles =
      Array.isArray(
        marketData?.candles
      )
        ? marketData.candles
        : [];

    const currentPrice =
      marketData?.market
        ?.currentPrice ??
      null;

    const direction =
      marketData?.market
        ?.direction ||
      "neutral";

    // =======================================================
    // NEWS
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

    const gdp =
      Array.isArray(
        newsData?.gdp
      )
        ? newsData.gdp
        : [];

    // =======================================================
    // SYSTEM PROMPT
    // =======================================================

    const systemPrompt = `

تۆ ShahanFX AI Pro ـیت.

تۆ یارمەتیدەری زیرەکی پیشەیی بۆ:

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
یاسای سەرەکی
=========================================================

تەنها Live Data ـی پێدراو بەکاربهێنە.

هیچ Price ـێک مەخەڵقە.

هیچ News ـێک مەخەڵقە.

هیچ Actual / Forecast / Previous ـێک مەخەڵقە.

هیچ Entry / SL / TP ـێک مەخەڵقە
ئەگەر Candle Data پشتگیری نەکات.

ئەگەر News Engine بەردەست نییە:
بڵێ:
"داتای ڕاستەوخۆی هەواڵەکان بەردەست نییە."

بەڵام ئەگەر News Engine کار دەکات
و CPI لە داتا نییە:

بڵێ:
"لە ماوەی پشکنراودا هیچ CPI ـیەک نەدۆزرایەوە."

ئەم دوو بارودۆخە تێکەڵ مەکە.

=========================================================
زمان
=========================================================

هەموو وەڵامەکان بە کوردی سۆرانی بن.

وشە پیشەییەکانی Forex / ICT / SMC
دەتوانرێت بە ئینگلیزی لەگەڵ کوردی بەکاربهێنرێن.

=========================================================
CPI
=========================================================

کاتێک بەکارهێنەر دەڵێت:

"CPI هەیە؟"
"هەواڵی CPI هەیە؟"
"CPI چییە؟"

CPI ـی LIVE DATA بپشکنە.

ئەگەر CPI هەیە:

📰 CPI
📅 Date
⚡ Impact
💵 Currency
📊 Actual
📊 Forecast
📊 Previous

هەموو ژمارەکان تەنها لە DATA ـەوە.

ئەگەر Actual null ـە:

Actual: هێشتا بەردەست نییە

مەڵێ:
"داتای هەواڵ بەردەست نییە"
ئەگەر CPI event خۆی بەردەستە.

ئەگەر CPI بەردەستە بەڵام Actual نەدراوە:
ئەمە بە مانای "هەواڵ نییە" نییە.

=========================================================
NEWS INTERPRETATION
=========================================================

CPI دەتوانێت کاریگەری لەسەر USD و Gold هەبێت.

بەڵام هیچ Direction ـێک Guaranteed نییە.

News + Price Action پێکەوە شیکاربکە.

CPI Actual > Forecast
دەتوانێت USD بەهێز بکات
و فشار لەسەر Gold دروست بکات.

CPI Actual < Forecast
دەتوانێت USD لاواز بکات
و Gold پشتگیری بکات.

بەڵام ئەمە تەنها Context ـە،
نەک Guaranteed Trade Direction.

=========================================================
NEWS + CANDLE
=========================================================

ئەگەر News Time لەگەڵ Candle Time نزیکە:

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

ئەگەر هاوتەریب بوون:

"News و Price Reaction لە یەک ئاڕاستەدان."

ئەگەر پێچەوانە بوون:

"News و Price Reaction پێکەوە ناگونجێن؛ Confirmation پێویستە."

=========================================================
ICT / SMC
=========================================================

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

هیچ Level ـێک مەخەڵقە.

تەنها Level ـێک بەکاربهێنە
کە Candle Data پشتگیری بکات.

=========================================================
TRADE SETUP
=========================================================

ئەگەر Structure ڕوون نییە:

🎯 Setup: WAIT

ئەگەر News زۆر نزیکە:

🎯 Setup: WAIT

ئەگەر Volatility زۆر بەرزە:

🎯 Setup: WAIT

ئەگەر Confirmation نییە:

🎯 Setup: WAIT

هیچ Trade ـێک 100% Guaranteed نییە.

=========================================================
TRADE FORMAT
=========================================================

📊 SHAHANFX AI PRO

🥇 Symbol:
⏱ Timeframe:
💰 Current Price:

📰 News:
📅 News Time:
📊 Actual:
📊 Forecast:
📊 Previous:
⚡ Impact:

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

⚠️ Risk Warning:

=========================================================
LOT SIZE
=========================================================

ئەگەر Balance و Risk % نەدراوە:

Lot Size مەحسابە.

بڵێ:

"بۆ دیاریکردنی Lot Size ـی ورد،
Balance و Risk % پێویستە."

`;

    // =======================================================
    // LIVE CONTEXT
    // =======================================================

    const liveContext = `

================ LIVE MARKET ================

Connected:
${marketData?.success}

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

Connected:
${newsData?.success}

Source:
${newsData?.source || "Unavailable"}

Range:
${JSON.stringify(
  newsData?.range || null
)}

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

================ GDP ================

${JSON.stringify(
  gdp,
  null,
  2
)}

================ USER REQUEST ================

${message || "ئەم Chart ـە شیکاربکە."}

`;

    // =======================================================
    // GEMINI PARTS
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

    let response =
      null;

    let data =
      null;

    let usedModel =
      null;

    // =======================================================
    // GEMINI
    // =======================================================

    for (
      const model of models
    ) {
      try {

        const endpoint =
          "https://generativelanguage.googleapis.com/v1beta/models/" +
          model +
          ":generateContent";

        response =
          await fetch(
            endpoint,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                "x-goog-api-key":
                  geminiKey
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

        if (
          response.ok
        ) {
          usedModel =
            model;

          break;
        }

        console.error(
          `Gemini ${model}:`,
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

        debug: {
          marketError:
            marketData?.error ||
            null,

          newsError:
            newsData?.error ||
            null,

          geminiError:
            data?.error?.message ||
            null
        }

      });
    }

    // =======================================================
    // EXTRACT ANSWER
    // =======================================================

    const answer =
      data
        ?.candidates?.[0]
        ?.content?.parts
        ?.filter(
          p =>
            typeof p.text ===
            "string"
        )
        ?.map(
          p => p.text
        )
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

        direction,

        candles:
          candles.length
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

        gdp:
          gdp.length,

        important:
          importantNews.length
      }

    });

  } catch (error) {

    console.error(
      "SHAHANFX UNIFIED ENGINE:",
      error
    );

    return res.status(500).json({

      success: false,

      error:
        "هەڵەی ناوخۆی ShahanFX Unified Engine ڕوویدا.",

      details:
        error?.message ||
        null

    });
  }
}
