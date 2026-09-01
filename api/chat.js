export default async function handler(req, res) {

  // =========================================================
  // SHAHANFX AI PRO
  // Forex • ICT • SMC • Chart Vision
  // LIVE MARKET + NEWS + AI
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
          "GEMINI_API_KEY لە Vercel دانەنراوە."
      });
    }


    // =======================================================
    // USER REQUEST
    // =======================================================

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
          "تکایە پرسیار یان وێنەی Chart بنێرە."
      });
    }


    // =======================================================
    // MARKET SETTINGS
    // =======================================================

    let symbol =
      body.symbol ||
      "XAU/USD";

    const interval =
      body.interval ||
      "5min";


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


    const mapped =
      symbolMap[
        String(symbol).toUpperCase()
      ];

    if (mapped) {
      symbol = mapped;
    }


    // =======================================================
    // SAFE INTERVAL
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
    // LIVE MARKET DATA
    // =======================================================

    let marketData = null;
    let marketError = null;


    if (twelveKey) {

      try {

        const marketURL =
          new URL(
            "https://api.twelvedata.com/time_series"
          );

        marketURL.searchParams.set(
          "symbol",
          symbol
        );

        marketURL.searchParams.set(
          "interval",
          safeInterval
        );

        marketURL.searchParams.set(
          "outputsize",
          "100"
        );

        marketURL.searchParams.set(
          "order",
          "desc"
        );

        marketURL.searchParams.set(
          "apikey",
          twelveKey
        );


        const marketResponse =
          await fetch(
            marketURL.toString()
          );


        const rawMarket =
          await marketResponse.json();


        if (
          !marketResponse.ok ||
          rawMarket?.status === "error"
        ) {

          marketError =
            rawMarket?.message ||
            "Market API error";

        } else {

          const values =
            Array.isArray(
              rawMarket?.values
            )
              ? rawMarket.values
              : [];


          const candles =
            values.map(c => ({
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

            } else if (
              current.close <
              previous.close
            ) {

              direction =
                "bearish";
            }
          }


          marketData = {

            source:
              "Twelve Data",

            symbol,

            interval:
              safeInterval,

            currentPrice:
              current?.close ??
              null,

            direction,

            currentCandle:
              current,

            previousCandle:
              previous,

            candles

          };

        }

      } catch (error) {

        console.error(
          "Market fetch error:",
          error
        );

        marketError =
          error.message;

      }

    } else {

      marketError =
        "TWELVE_DATA_API_KEY نەدۆزرایەوە.";

    }


    // =======================================================
    // LIVE ECONOMIC NEWS
    // =======================================================

    let newsData = null;
    let newsError = null;


    if (fmpKey) {

      try {

        const today =
          new Date();

        const from =
          today
            .toISOString()
            .slice(0, 10);


        const future =
          new Date(today);

        future.setDate(
          future.getDate() + 7
        );


        const to =
          future
            .toISOString()
            .slice(0, 10);


        const newsURL =
          new URL(
            "https://financialmodelingprep.com/stable/economic-calendar"
          );


        newsURL.searchParams.set(
          "from",
          from
        );

        newsURL.searchParams.set(
          "to",
          to
        );

        newsURL.searchParams.set(
          "apikey",
          fmpKey
        );


        const newsResponse =
          await fetch(
            newsURL.toString()
          );


        const rawNews =
          await newsResponse.json();


        if (
          !newsResponse.ok ||
          (
            rawNews &&
            !Array.isArray(rawNews) &&
            (
              rawNews.error ||
              rawNews.message
            )
          )
        ) {

          newsError =
            rawNews?.message ||
            rawNews?.error ||
            "News API error";

        } else {

          const events =
            Array.isArray(rawNews)
              ? rawNews
              : [];


          const importantWords = [

            "CPI",
            "CONSUMER PRICE",
            "INFLATION",

            "NFP",
            "NON FARM",
            "NONFARM",
            "PAYROLL",

            "UNEMPLOYMENT",
            "EMPLOYMENT",

            "FOMC",
            "FEDERAL FUNDS",
            "INTEREST RATE",
            "FEDERAL RESERVE",

            "GDP",
            "GROSS DOMESTIC",

            "PPI",
            "PRODUCER PRICE",

            "PCE",
            "CORE PCE",

            "RETAIL SALES",

            "PMI",
            "ISM",

            "CONSUMER CONFIDENCE",

            "CONSUMER SENTIMENT"
          ];


          const usdEvents =
            events
              .map(event => {

                const text =
                  JSON.stringify(
                    event
                  ).toUpperCase();


                const important =
                  importantWords.some(
                    word =>
                      text.includes(word)
                  );


                const country =
                  String(
                    event.country ||
                    event.currency ||
                    ""
                  ).toUpperCase();


                const usdRelated =
                  country.includes("US") ||
                  country.includes("USA") ||
                  country.includes("UNITED STATES") ||
                  country.includes("USD") ||
                  text.includes('"USD"');


                if (
                  !important ||
                  !usdRelated
                ) {
                  return null;
                }


                return {

                  date:
                    event.date ||
                    event.datetime ||
                    null,

                  event:
                    event.event ||
                    event.name ||
                    event.title ||
                    null,

                  country:
                    event.country ||
                    null,

                  currency:
                    event.currency ||
                    "USD",

                  importance:
                    event.importance ||
                    event.impact ||
                    event.priority ||
                    null,

                  actual:
                    event.actual ??
                    event.value ??
                    event.current ??
                    null,

                  forecast:
                    event.forecast ??
                    event.estimate ??
                    event.consensus ??
                    null,

                  previous:
                    event.previous ??
                    event.prev ??
                    null

                };

              })
              .filter(Boolean);


          newsData = {

            source:
              "Financial Modeling Prep",

            from,

            to,

            totalEvents:
              events.length,

            importantEvents:
              usdEvents.length,

            events:
              usdEvents

          };

        }

      } catch (error) {

        console.error(
          "News fetch error:",
          error
        );

        newsError =
          error.message;

      }

    } else {

      newsError =
        "FMP_API_KEY نەدۆزرایەوە.";

    }


    // =======================================================
    // DATA CONTEXT FOR AI
    // =======================================================

    const liveContext = {

      MARKET_DATA:

        marketData
          ? marketData
          : {
              unavailable: true,
              error: marketError
            },


      ECONOMIC_NEWS:

        newsData
          ? newsData
          : {
              unavailable: true,
              error: newsError
            }

    };


    // =======================================================
    // SHAHANFX SYSTEM PROMPT
    // =======================================================

    const systemPrompt = `

تۆ ShahanFX AI Pro ـیت.

تۆ ڕاوێژکاری پیشەیی بۆ:

Forex
ICT
SMC
Price Action
Market Structure
Technical Analysis
Chart Vision
Economic News
Risk Management

زمانی وەڵام:
کوردی سۆرانی.

=========================================================
LIVE DATA RULE
=========================================================

داتای MARKET_DATA و ECONOMIC_NEWS کە لە خوارەوە دراوە
داتای سێرڤەرە.

تەنها ئەو داتایە بەکاربهێنە کە بە ڕوونی لە context ـەکەدا هەیە.

هیچ current price ـێک مەخەڵقە.

هیچ news ـێک مەخەڵقە.

هیچ CPI/NFP/FOMC ـێک مەخەڵقە.

ئەگەر news data بەردەست نییە:

بڵێ:
"داتای هەواڵ لە ئێستادا بەردەست نییە."

ئەگەر market data بەردەست نییە:

بڵێ:
"داتای زیندووی بازاڕ بەردەست نییە."

=========================================================
NEWS + MARKET COMBINATION
=========================================================

کاتێک news data هەیە:

1. Event ـەکە بناسەوە.
2. Actual / Forecast / Previous بەراورد بکە.
3. گرنگیی event دیاری بکە.
4. کاریگەریی ئەگەری لەسەر USD ڕوون بکەوە.
5. کاریگەریی ئەگەری لەسەر XAUUSD یان symbol ـی داواکراو ڕوون بکەوە.
6. پاشان Candle Reaction لە market data بپشکنە.
7. News و Price Action بە یەکەوە هەڵبسەنگێنە.

بەڵام:

News Impact = پێشبینییە،
نەک دڵنیایی.

=========================================================
ICT / SMC
=========================================================

Market Structure:

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

=========================================================
CHART VISION
=========================================================

ئەگەر image هەیە:

Symbol
Timeframe
Price
Trend
Structure
HH
HL
LH
LL
BOS
CHOCH
Liquidity
Sweep
FVG
Order Block
Support
Resistance
Premium
Discount
Candlestick Confirmation

تەنها ئەو شتانە بڵێ کە لە image ـەکەدا دەبینرێن.

ئەگەر شتێک ڕوون نییە:
مەخەڵقە.

=========================================================
MARKET ANALYSIS
=========================================================

کاتێک candles هەیە:

دوایین candles بخوێنەوە.

Trend دیاری بکە.

Momentum دیاری بکە.

Bullish/Bearish displacement بپشکنە.

Structure breaks بپشکنە.

Liquidity levels هەڵسەنگێنە.

FVG و OB تەنها ئەگەر evidence هەبێت باس بکە.

=========================================================
CPI / NFP / FOMC
=========================================================

بۆ CPI:

Actual
Forecast
Previous

ئەگەر:

Actual > Forecast

ئەمە دەتوانێت فشار لەسەر USD زیاد بکات،
بەڵام reaction ـی بازاڕ هەمیشە پێویستە پشتڕاست بکرێتەوە.

ئەگەر:

Actual < Forecast

ئەمە دەتوانێت فشار لەسەر USD کەم بکات،
بەڵام هیچ guarantee ـێک نییە.

بۆ Gold:

USD و yields و market expectations
دەتوانن کاریگەرییان هەبێت.

بەڵام تەنها لەسەر ئەو data ـەی بەردەستە قسە بکە.

=========================================================
TRADE SETUP
=========================================================

ئەگەر setup ـێک هەیە:

📊 SHAHANFX AI PRO

🥇 Symbol:
...

⏱ Timeframe:
...

📈 Market Bias:
Bullish / Bearish / Neutral

📰 News:
...

⚡ News Impact:
...

💰 Current Price:
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
هیچ trade ـێک 100% دڵنیایی نییە.

=========================================================
RISK MANAGEMENT
=========================================================

Balance و Risk % ئەگەر نەدراوە:

Lot Size مەخەڵقە.

بڵێ:

"بۆ Lot Size ـی ورد Balance و Risk % پێویستە."

=========================================================
FINAL RULE
=========================================================

Evidence > Guess

Live Data > Assumption

Confirmation > Prediction

Risk Management > Profit

ئەگەر confirmation نییە:

WAIT.

`;


    // =======================================================
    // BUILD USER CONTEXT
    // =======================================================

    const contextText = `

=========================================================
LIVE MARKET DATA
=========================================================

${JSON.stringify(
  liveContext.MARKET_DATA,
  null,
  2
)}

=========================================================
LIVE ECONOMIC NEWS
=========================================================

${JSON.stringify(
  liveContext.ECONOMIC_NEWS,
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
          contextText
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


    let response = null;
    let data = null;
    let usedModel = null;


    // =======================================================
    // GEMINI REQUEST
    // =======================================================

    for (
      const model of models
    ) {

      try {

        const endpoint =
          "https://generativelanguage.googleapis.com/v1beta/models/" +
          model +
          ":generateContent?key=" +
          encodeURIComponent(
            geminiKey
          );


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
                      5000

                  },

                  thinkingConfig: {

                    thinkingLevel:
                      "medium"

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

          errorText.includes(
            "high demand"
          ) ||

          errorText.includes(
            "overloaded"
          ) ||

          errorText.includes(
            "temporarily unavailable"
          ) ||

          errorText.includes(
            "resource exhausted"
          );


        if (!retryable) {
          break;
        }


        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              1000
            )
        );

      } catch (error) {

        console.error(
          `Gemini ${model} error:`,
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

      console.error(
        "Gemini failed:",
        data
      );


      return res.status(503).json({

        success:
          false,

        error:
          "⚠️ ShahanFX AI لە ئێستادا بەردەست نییە. تکایە دووبارە هەوڵ بدە.",

        marketAvailable:
          Boolean(
            marketData
          ),

        newsAvailable:
          Boolean(
            newsData
          )

      });

    }


    // =======================================================
    // ANSWER
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

        success:
          false,

        error:
          "Gemini هیچ وەڵامێکی دروستی نەگەڕاندەوە."

      });

    }


    // =======================================================
    // FINAL RESPONSE
    // =======================================================

    return res.status(200).json({

      success:
        true,

      answer,

      model:
        usedModel,

      symbol,

      interval:
        safeInterval,

      hasImage:
        Boolean(
          image?.data &&
          image?.mimeType
        ),

      liveData: {

        market:
          Boolean(
            marketData
          ),

        news:
          Boolean(
            newsData
          )

      }

    });


  } catch (error) {

    console.error(
      "SHAHANFX CHAT ERROR:",
      error
    );


    return res.status(500).json({

      success:
        false,

      error:
        "هەڵەی ناوخۆی ShahanFX AI ڕوویدا."

    });

  }

}
