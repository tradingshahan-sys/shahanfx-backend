export default async function handler(req, res) {

  // =========================================================
  // SHAHANFX AI PRO
  // ONE COMPLETE ENGINE
  // MARKET + NEWS + CPI + NFP + FOMC + PPI + GEMINI
  // Endpoint:
  // POST /api/chat
  // GET  /api/chat?action=cpi
  // GET  /api/chat?action=news
  // =========================================================

  // =========================
  // CORS
  // =========================

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

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "تەنها GET یان POST ڕێگەپێدراوە."
    });
  }

  try {

    // =======================================================
    // ENV
    // =======================================================

    const geminiKey = process.env.GEMINI_API_KEY;
    const twelveKey = process.env.TWELVE_DATA_API_KEY;
    const fmpKey = process.env.FMP_API_KEY;

    // =======================================================
    // INPUT
    // =======================================================

    const input =
      req.method === "GET"
        ? (req.query || {})
        : (req.body || {});

    const action =
      String(input.action || "").toLowerCase().trim();

    const message =
      typeof input.message === "string"
        ? input.message.trim()
        : "";

    const symbol =
      input.symbol || "XAU/USD";

    const interval =
      input.interval || "5min";

    // =======================================================
    // DATE
    // =======================================================

    const today = new Date();

    const todayString =
      today.toISOString().slice(0, 10);

    const startDate =
      input.startDate || todayString;

    const endDate =
      input.endDate || startDate;

    // =======================================================
    // SYMBOL MAP
    // =======================================================

    const symbolMap = {
      XAUUSD: "XAU/USD",
      GOLD: "XAU/USD",
      EURUSD: "EUR/USD",
      GBPUSD: "GBP/USD",
      USDJPY: "USD/JPY",
      USDCHF: "USD/CHF",
      AUDUSD: "AUD/USD",
      USDCAD: "USD/CAD",
      NZDUSD: "NZD/USD"
    };

    const mapped =
      symbolMap[
        String(symbol).toUpperCase().replace(/\s/g, "")
      ];

    const finalSymbol =
      mapped || symbol;

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

    const safeInterval =
      allowedIntervals.includes(interval)
        ? interval
        : "5min";

    // =======================================================
    // =======================================================
    // MARKET ENGINE
    // =======================================================
    // =======================================================

    let marketData = {
      success: false,
      error: "Market API بەردەست نییە."
    };

    if (twelveKey) {

      try {

        const marketUrl =
          new URL(
            "https://api.twelvedata.com/time_series"
          );

        marketUrl.searchParams.set(
          "symbol",
          finalSymbol
        );

        marketUrl.searchParams.set(
          "interval",
          safeInterval
        );

        marketUrl.searchParams.set(
          "outputsize",
          "100"
        );

        marketUrl.searchParams.set(
          "order",
          "desc"
        );

        marketUrl.searchParams.set(
          "apikey",
          twelveKey
        );

        const response =
          await fetch(
            marketUrl.toString()
          );

        const data =
          await response.json();

        if (
          response.ok &&
          data &&
          !data.error &&
          Array.isArray(data.values)
        ) {

          const candles =
            data.values.map(c => ({
              datetime:
                c.datetime || null,

              open:
                Number(c.open),

              high:
                Number(c.high),

              low:
                Number(c.low),

              close:
                Number(c.close),

              volume:
                c.volume !== undefined
                  ? Number(c.volume)
                  : null
            }));

          const current =
            candles[0] || null;

          const previous =
            candles[1] || null;

          let direction =
            "neutral";

          if (current && previous) {

            if (
              current.close >
              previous.close
            ) {
              direction = "bullish";
            }

            if (
              current.close <
              previous.close
            ) {
              direction = "bearish";
            }
          }

          marketData = {

            success: true,

            source:
              "Twelve Data",

            symbol:
              finalSymbol,

            interval:
              safeInterval,

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
              data.meta || null

          };

        } else {

          marketData = {
            success: false,
            error:
              data?.message ||
              data?.error ||
              "Twelve Data داتا نەهێنا."
          };

        }

      } catch (error) {

        console.error(
          "MARKET ENGINE ERROR:",
          error
        );

        marketData = {
          success: false,
          error:
            "هەڵە لە Market Engine."
        };

      }

    }

    // =======================================================
    // =======================================================
    // NEWS ENGINE
    // =======================================================
    // =======================================================

    let newsData = {
      success: false,
      error: "News API بەردەست نییە."
    };

    if (fmpKey) {

      try {

        const newsUrl =
          new URL(
            "https://financialmodelingprep.com/stable/economic-calendar"
          );

        newsUrl.searchParams.set(
          "from",
          startDate
        );

        newsUrl.searchParams.set(
          "to",
          endDate
        );

        newsUrl.searchParams.set(
          "apikey",
          fmpKey
        );

        const response =
          await fetch(
            newsUrl.toString(),
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

          newsData = {
            success: false,
            error:
              data?.message ||
              "FMP API هەڵەیەکی گەڕاندەوە."
          };

        } else {

          const events =
            Array.isArray(data)
              ? data
              : [];

          // =================================================
          // US EVENTS
          // =================================================

          const usEvents =
            events.filter(event => {

              const country =
                String(
                  event?.country || ""
                ).toUpperCase();

              return (
                country === "US" ||
                country === "USA" ||
                country ===
                  "UNITED STATES"
              );

            });

          // =================================================
          // IMPORTANT KEYWORDS
          // =================================================

          const keywords = [

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

          // =================================================
          // NORMALIZE
          // =================================================

          const normalizeEvent =
            event => ({

              date:
                event?.date ||
                null,

              country:
                event?.country ||
                null,

              event:
                event?.event ||
                event?.name ||
                null,

              impact:
                event?.impact ||
                event?.importance ||
                null,

              actual:
                event?.actual ??
                null,

              estimate:
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
            usEvents.map(
              normalizeEvent
            );

          // =================================================
          // IMPORTANT
          // =================================================

          const important =
            normalized.filter(event => {

              const name =
                String(
                  event.event || ""
                ).toLowerCase();

              return keywords.some(
                keyword =>
                  name.includes(
                    keyword.toLowerCase()
                  )
              );

            });

          // =================================================
          // HIGH IMPACT
          // =================================================

          const highImpact =
            normalized.filter(event => {

              const impact =
                String(
                  event.impact || ""
                ).toLowerCase();

              return (
                impact.includes("high") ||
                impact === "3" ||
                impact.includes("3")
              );

            });

          // =================================================
          // CPI
          // =================================================

          const cpi =
            normalized.filter(event => {

              const name =
                String(
                  event.event || ""
                ).toLowerCase();

              return (
                name.includes("cpi") ||
                name.includes(
                  "consumer price index"
                )
              );

            });

          // =================================================
          // NFP
          // =================================================

          const nfp =
            normalized.filter(event => {

              const name =
                String(
                  event.event || ""
                ).toLowerCase();

              return (
                name.includes("non farm") ||
                name.includes("non-farm") ||
                name.includes("nonfarm") ||
                name.includes("payroll") ||
                name === "nfp"
              );

            });

          // =================================================
          // FOMC
          // =================================================

          const fomc =
            normalized.filter(event => {

              const name =
                String(
                  event.event || ""
                ).toLowerCase();

              return (
                name.includes("fomc") ||
                name.includes("federal funds") ||
                name.includes("interest rate")
              );

            });

          // =================================================
          // PPI
          // =================================================

          const ppi =
            normalized.filter(event => {

              const name =
                String(
                  event.event || ""
                ).toLowerCase();

              return (
                name.includes("ppi") ||
                name.includes(
                  "producer price"
                )
              );

            });

          newsData = {

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
                important.length,

              highImpactEvents:
                highImpact.length,

              cpi:
                cpi.length,

              nfp:
                nfp.length,

              fomc:
                fomc.length,

              ppi:
                ppi.length

            },

            importantNews:
              important,

            cpi,

            nfp,

            fomc,

            ppi,

            highImpact,

            events:
              normalized

          };

        }

      } catch (error) {

        console.error(
          "NEWS ENGINE ERROR:",
          error
        );

        newsData = {
          success: false,
          error:
            "هەڵە لە News Engine."
        };

      }

    }

    // =======================================================
    // =======================================================
    // DIRECT CPI REQUEST
    // =======================================================
    // GET /api/chat?action=cpi
    // =======================================================
    // =======================================================

    if (action === "cpi") {

      if (!newsData.success) {

        return res.status(503).json({

          success: false,

          type: "cpi",

          message:
            "داتای CPI لە ئێستادا بەردەست نییە.",

          error:
            newsData.error

        });

      }

      const cpi =
        newsData.cpi || [];

      if (cpi.length === 0) {

        return res.status(200).json({

          success: true,

          type: "cpi",

          found: false,

          message:
            "لە داتای ئەمڕۆدا هیچ هەواڵێکی CPI بۆ US نەدۆزرایەوە.",

          date:
            todayString,

          source:
            newsData.source,

          cpi: []

        });

      }

      return res.status(200).json({

        success: true,

        type: "cpi",

        found: true,

        source:
          newsData.source,

        date:
          todayString,

        count:
          cpi.length,

        cpi:

          cpi.map(event => ({

            date:
              event.date,

            event:
              event.event,

            impact:
              event.impact,

            actual:
              event.actual,

            forecast:
              event.estimate,

            previous:
              event.previous,

            unit:
              event.unit,

            currency:
              event.currency

          }))

      });

    }

    // =======================================================
    // DIRECT NEWS REQUEST
    // =======================================================

    if (action === "news") {

      return res.status(200).json({

        success:
          newsData.success,

        type:
          "news",

        source:
          newsData.source || null,

        range:
          newsData.range || null,

        summary:
          newsData.summary || null,

        importantNews:
          newsData.importantNews || [],

        cpi:
          newsData.cpi || [],

        nfp:
          newsData.nfp || [],

        fomc:
          newsData.fomc || [],

        ppi:
          newsData.ppi || [],

        highImpact:
          newsData.highImpact || []

      });

    }

    // =======================================================
    // DIRECT MARKET REQUEST
    // =======================================================

    if (action === "market") {

      return res.status(200).json({

        success:
          marketData.success,

        type:
          "market",

        source:
          marketData.source || null,

        symbol:
          marketData.symbol ||
          finalSymbol,

        interval:
          marketData.interval ||
          safeInterval,

        market:
          marketData.market || null,

        candles:
          marketData.candles || []

      });

    }

    // =======================================================
    // GEMINI REQUIRED
    // =======================================================

    if (!geminiKey) {

      return res.status(500).json({

        success: false,

        error:
          "GEMINI_API_KEY لە Vercel Environment Variables دانەنراوە."

      });

    }

    // =======================================================
    // USER REQUEST
    // =======================================================

    if (!message && !input.image) {

      return res.status(400).json({

        success: false,

        error:
          "تکایە پرسیار یان وێنەی Chart بنێرە."

      });

    }

    // =======================================================
    // LIVE DATA
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

    const cpi =
      Array.isArray(newsData?.cpi)
        ? newsData.cpi
        : [];

    const nfp =
      Array.isArray(newsData?.nfp)
        ? newsData.nfp
        : [];

    const fomc =
      Array.isArray(newsData?.fomc)
        ? newsData.fomc
        : [];

    const ppi =
      Array.isArray(newsData?.ppi)
        ? newsData.ppi
        : [];

    const importantNews =
      Array.isArray(
        newsData?.importantNews
      )
        ? newsData.importantNews
        : [];

    // =======================================================
    // SYSTEM PROMPT
    // =======================================================

    const systemPrompt = `

تۆ ShahanFX AI Pro ـیت.

زمانی وەڵام:
کوردی سۆرانی.

تۆ پسپۆڕیت لە:

Forex
XAU/USD
ICT
SMC
Price Action
Market Structure
Liquidity
Economic News
Risk Management

=========================================================
یاسای زۆر گرنگ
=========================================================

تەنها داتای LIVE ـی نێردراو بەکاربهێنە.

هیچ نرخێک مەخەڵقە.

هیچ هەواڵێک مەخەڵقە.

هیچ CPI Actual/Forecast/Previous مەخەڵقە.

ئەگەر داتا نییە:

بڵێ:
"داتای ڕاستەوخۆی ئەم بەشە بەردەست نییە."

بەڵام ئەگەر آرشیفی ئەمڕۆ پشکنراوە و هیچ event ـێک نییە:

بڵێ:
"لە داتای ئەمڕۆدا هیچ CPI ـێک نەدۆزرایەوە."

=========================================================
CPI
=========================================================

کاتێک بەکارهێنەر دەڵێت:

CPI هەیە؟
هەواڵی CPI هەیە؟
CPI چییە؟
CPI بۆ زێڕ چۆنە؟

داتای CPI ـی LIVE پشکنە.

ئەگەر هەیە:

Date
Event
Impact
Actual
Forecast
Previous
Unit
Currency

پیشان بدە.

=========================================================
NEWS + GOLD
=========================================================

CPI بە تەنیا Direction ـی زێڕ Guaranteed ناکات.

بە گشتی:

CPI زۆرتر لە Forecast
→ دەتوانێت USD بەهێز بکات
→ دەتوانێت فشار لەسەر Gold دروست بکات.

CPI کەمتر لە Forecast
→ دەتوانێت USD لاواز بکات
→ دەتوانێت Gold پشتگیری بکات.

بەڵام هەمیشە Price Action و Market Structure پشتڕاستی بکەوە.

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
Breaker
Mitigation
Premium
Discount
Equilibrium
Displacement
Imbalance

=========================================================
TRADE
=========================================================

ئەگەر trade analysis داواکرا:

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
BUY / SELL / WAIT

📍 Entry:

🛑 Invalidation:

🎯 TP:

⚖️ Risk / Reward:

🧠 Confidence:

=========================================================
RISK
=========================================================

هیچ trade ـێک 100% Guaranteed نییە.

ئەگەر Balance و Risk % نییە:

Lot Size مەحسابە.

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

→ WAIT.

پێشنیاری trade بەبێ confirmation مەدە.

`;

    // =======================================================
    // LIVE CONTEXT
    // =======================================================

    const liveContext = `

================ LIVE MARKET ================

Source:
${marketData?.source || "Unavailable"}

Symbol:
${marketData?.symbol || finalSymbol}

Timeframe:
${marketData?.interval || safeInterval}

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

    const image =
      input.image || null;

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

    let geminiResponse = null;
    let geminiData = null;
    let usedModel = null;

    const MAX_RETRIES = 2;

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
            encodeURIComponent(
              geminiKey
            );

          geminiResponse =
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

                        parts

                      }

                    ],

                    generationConfig: {

                      maxOutputTokens:
                        5000,

                      temperature:
                        0.2

                    }

                  })

              }
            );

          geminiData =
            await geminiResponse.json();

          if (
            geminiResponse.ok
          ) {

            usedModel =
              model;

            break;

          }

          const errorText =
            String(
              geminiData?.error?.message ||
              ""
            ).toLowerCase();

          const retryable =
            geminiResponse.status === 429 ||
            geminiResponse.status === 500 ||
            geminiResponse.status === 502 ||
            geminiResponse.status === 503 ||
            geminiResponse.status === 504 ||
            errorText.includes(
              "resource exhausted"
            ) ||
            errorText.includes(
              "overloaded"
            ) ||
            errorText.includes(
              "unavailable"
            );

          if (!retryable) {
            break;
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
                  Math.pow(
                    2,
                    attempt
                  )
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
                  Math.pow(
                    2,
                    attempt
                  )
                )
            );

          }

        }

      }

      if (usedModel) {
        break;
      }

    }

    // =======================================================
    // GEMINI FAILED
    // =======================================================

    if (
      !geminiResponse ||
      !geminiResponse.ok ||
      !usedModel
    ) {

      console.error(
        "Gemini failed:",
        geminiData
      );

      return res.status(503).json({

        success: false,

        error:
          "⚠️ ShahanFX AI لە ئێستادا بەردەست نییە. تکایە دووبارە هەوڵ بدە.",

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
    // ANSWER
    // =======================================================

    const answer =
      geminiData
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
          finalSymbol,

        interval:
          marketData?.interval ||
          safeInterval,

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
        error?.message || null

    });

  }

}
