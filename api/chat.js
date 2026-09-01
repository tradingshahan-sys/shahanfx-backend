export default async function handler(req, res) {
  // =========================================================
  // SHAHANFX AI PRO
  // GEMINI + OPENROUTER FALLBACK
  // KURDISH SORANI ONLY
  // MARKET + NEWS + CPI + NFP + FOMC + PPI + CHART
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
    // API KEYS
    // =======================================================

    const geminiKey = process.env.GEMINI_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;
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
    const todayString = today.toISOString().slice(0, 10);

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
        String(symbol)
          .toUpperCase()
          .replace(/\s/g, "")
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
    // MARKET ENGINE
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

          let direction = "neutral";

          if (current && previous) {
            if (
              current.close >
              previous.close
            ) {
              direction = "bullish";
            } else if (
              current.close <
              previous.close
            ) {
              direction = "bearish";
            }
          }

          marketData = {
            success: true,
            source: "Twelve Data",
            symbol: finalSymbol,
            interval: safeInterval,

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
    // NEWS ENGINE
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

          const normalizeEvent =
            event => ({
              date:
                event?.date || null,

              country:
                event?.country || null,

              event:
                event?.event ||
                event?.name ||
                null,

              impact:
                event?.impact ||
                event?.importance ||
                null,

              actual:
                event?.actual ?? null,

              estimate:
                event?.estimate ??
                event?.forecast ??
                null,

              previous:
                event?.previous ?? null,

              unit:
                event?.unit || null,

              currency:
                event?.currency || null
            });

          const normalized =
            usEvents.map(
              normalizeEvent
            );

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
            events: normalized
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
    // DIRECT CPI
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

      return res.status(200).json({
        success: true,
        type: "cpi",
        found: cpi.length > 0,

        message:
          cpi.length
            ? "داتای CPI دۆزرایەوە."
            : "لە داتای ئەمڕۆدا هیچ CPI ـێکی US نەدۆزرایەوە.",

        source:
          newsData.source,

        date:
          todayString,

        count:
          cpi.length,

        cpi
      });
    }

    // =======================================================
    // DIRECT NEWS
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
    // DIRECT MARKET
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
    // REQUEST VALIDATION
    // =======================================================

    if (!message && !input.image) {
      return res.status(400).json({
        success: false,
        error:
          "تکایە پرسیار یان وێنەی Chart بنێرە."
      });
    }

    // =======================================================
    // CHECK AI PROVIDERS
    // =======================================================

    if (!geminiKey && !openRouterKey) {
      return res.status(500).json({
        success: false,
        error:
          "هیچ AI API ـیەک دانەنراوە. GEMINI_API_KEY یان OPENROUTER_API_KEY زیاد بکە."
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
      marketData?.market?.currentPrice ??
      null;

    const direction =
      marketData?.market?.direction ??
      "neutral";

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
    // STRONG KURDISH SYSTEM PROMPT
    // =======================================================

    const systemPrompt = `
تۆ ShahanFX AI Pro ـیت.

🚨 یاسای زۆر گرنگ:

هەموو وەڵامەکەت دەبێت بە زمانی کوردی سۆرانی بێت.

تەنها کوردی سۆرانی بەکاربهێنە.

بە هیچ شێوەیەک وەڵامی سەرەکی بە ئینگلیزی مەنووسە.

ئەگەر ناوی زانستی یان کورتکراوەی Forex پێویست بوو،
تەنها ئەو وشەیە بە ئینگلیزی بهێڵەوە و ڕوونکردنەوەکە بە کوردی بێت.

نموونە:

FVG = کەلێنی نرخی دادەبڕێت

BOS = شکاندنی ساختاری بازاڕ

CHOCH = گۆڕانی کاراکتری بازاڕ

Liquidity = شلەیی بازاڕ

Order Block = ناوچەی داڕشتنی فەرمان

Premium = ناوچەی بەرز

Discount = ناوچەی نزم

WAIT = چاوەڕوان بە

BUY = کڕین

SELL = فرۆشتن

هەموو ئەمانە لە وەڵامدا بە شێوەی کوردی ڕوون بکەرەوە.

========================================================

تۆ پسپۆڕی:

Forex
XAU/USD
ICT
SMC
Price Action
Market Structure
Liquidity
FVG
Order Block
BOS
CHOCH
Risk Management
Economic News

========================================================

داتا

تەنها داتای ڕاستەوخۆی نێردراو بەکاربهێنە.

هیچ نرخێک مەخەڵقە.

هیچ هەواڵێک مەخەڵقە.

هیچ CPI Actual/Forecast/Previous مەخەڵقە.

ئەگەر داتا بەردەست نییە:

"داتای ڕاستەوخۆی ئەم بەشە بەردەست نییە."

بڵێ.

========================================================

CPI / NFP / FOMC / PPI

ئەگەر داتا هەیە:

Date
Event
Impact
Actual
Forecast
Previous

پیشان بدە، بەڵام ڕوونکردنەوە بە کوردی بێت.

ئەگەر داتا نییە، هیچ شتێک مەخەڵقە.

========================================================

XAU/USD

لە شیکردنەوەی زێڕدا پشکنین بکە:

Market Bias
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
Breaker
Mitigation
Premium
Discount
Equilibrium
Displacement
Candle Reaction

========================================================

TRADE ANALYSIS

کاتێک بەکارهێنەر داوای شیکردنەوەی Trade دەکات،
ئەم شێوازە بەکاربهێنە:

📊 SHAHANFX AI PRO

🥇 نیشانە:
⏱ چوارچێوەی کات:
💰 نرخی ئێستا:

📰 هەواڵ:

📊 Actual:
📊 Forecast:
📊 Previous:

⚡ کاریگەری هەواڵ:

📈 ئاراستەی بازاڕ:

🏗 ساختاری بازاڕ:

🔥 BOS / CHOCH:

💧 Liquidity:

📦 FVG:

🧱 Order Block:

🕯 کاردانەوەی شەمە:

🎯 Setup:
BUY / SELL / WAIT

📍 Entry:

🛑 Invalidation:

🎯 TP:

⚖️ Risk / Reward:

🧠 Confidence:

========================================================

یاسای Trade

هیچ Trade ـێک 100% دڵنیایی نییە.

ئەگەر Confirmation نییە:

WAIT

پێشنیاری BUY یان SELL بەبێ Confirmation مەدە.

ئەگەر News نزیکە:

WAIT

ئەگەر Structure ناڕوونە:

WAIT

ئەگەر Volatility زۆر بەرزە:

WAIT

========================================================

🔥 گرنگترین یاسای زمان:

لە کۆتایی وەڵامدا هەموو ڕستەکان بە کوردی سۆرانی بن.

هیچ paragraph ـێکی ئینگلیزی مەنووسە.

وەڵامەکە سروشتی، ڕوون و ئاسان بێت.

========================================================
`;

    // =======================================================
    // LIVE CONTEXT
    // =======================================================

    const liveContext = `

================ داتای بازاڕ ================

سەرچاوە:
${marketData?.source || "بەردەست نییە"}

نیشانە:
${marketData?.symbol || finalSymbol}

چوارچێوەی کات:
${marketData?.interval || safeInterval}

نرخی ئێستا:
${currentPrice ?? "بەردەست نییە"}

ئاراستە:
${direction}

شەمەکان:
${JSON.stringify(
  candles.slice(0, 100),
  null,
  2
)}

================ هەواڵ ================

سەرچاوە:
${newsData?.source || "بەردەست نییە"}

هەواڵە گرنگەکان:
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

================ پرسیاری بەکارهێنەر ================

${message || "ئەم Chart ـە شیکاربکە."}

`;

    // =======================================================
    // IMAGE
    // =======================================================

    const image =
      input.image || null;

    // =======================================================
    // GEMINI REQUEST
    // =======================================================

    async function askGemini() {
      if (!geminiKey) {
        throw new Error(
          "Gemini API Key نییە."
        );
      }

      const parts = [
        {
          text:
            systemPrompt +
            liveContext
        }
      ];

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

      const models = [
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-3.5-flash"
      ];

      let lastError = null;

      for (const model of models) {
        try {
          const endpoint =
            "https://generativelanguage.googleapis.com/v1beta/models/" +
            model +
            ":generateContent?key=" +
            encodeURIComponent(
              geminiKey
            );

          const response =
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
                      temperature: 0.2
                    }
                  })
              }
            );

          const data =
            await response.json();

          if (response.ok) {
            const answer =
              data
                ?.candidates?.[0]
                ?.content?.parts
                ?.map(
                  p =>
                    p.text || ""
                )
                .join("")
                .trim();

            if (answer) {
              return {
                answer,
                provider: "Gemini",
                model
              };
            }
          }

          lastError =
            data?.error?.message ||
            "Gemini وەڵامی نەدا.";
        } catch (error) {
          lastError =
            error?.message ||
            "Gemini هەڵەی هەبوو.";
        }
      }

      throw new Error(
        lastError ||
        "Gemini بەردەست نییە."
      );
    }

    // =======================================================
    // OPENROUTER REQUEST
    // =======================================================

    async function askOpenRouter() {
      if (!openRouterKey) {
        throw new Error(
          "OpenRouter API Key نییە."
        );
      }

      const messages = [
        {
          role: "system",
          content:
            systemPrompt
        },
        {
          role: "user",
          content:
            liveContext
        }
      ];

      // =====================================================
      // IMAGE SUPPORT
      // =====================================================

      if (
        image &&
        image.data &&
        image.mimeType
      ) {
        messages[1].content = [
          {
            type: "text",
            text:
              liveContext
          },
          {
            type: "image_url",
            image_url: {
              url:
                `data:${image.mimeType};base64,${image.data}`
            }
          }
        ];
      }

      const models = [
        "openai/gpt-oss-120b:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "qwen/qwen3-30b-a3b:free"
      ];

      let lastError = null;

      for (const model of models) {
        try {
          const response =
            await fetch(
              "https://openrouter.ai/api/v1/chat/completions",
              {
                method: "POST",

                headers: {
                  "Authorization":
                    `Bearer ${openRouterKey}`,

                  "Content-Type":
                    "application/json",

                  "HTTP-Referer":
                    "https://shahanfx.vercel.app",

                  "X-Title":
                    "ShahanFX AI"
                },

                body:
                  JSON.stringify({
                    model,

                    messages,

                    temperature: 0.2,

                    max_tokens: 5000
                  })
              }
            );

          const data =
            await response.json();

          if (response.ok) {
            const answer =
              data
                ?.choices?.[0]
                ?.message?.content
                ?.trim();

            if (answer) {
              return {
                answer,
                provider:
                  "OpenRouter",

                model
              };
            }
          }

          lastError =
            data?.error?.message ||
            "OpenRouter وەڵامی نەدا.";
        } catch (error) {
          lastError =
            error?.message ||
            "OpenRouter هەڵەی هەبوو.";
        }
      }

      throw new Error(
        lastError ||
        "OpenRouter بەردەست نییە."
      );
    }

    // =======================================================
    // AI FAILOVER
    // =======================================================

    let result = null;

    // -------------------------------------------------------
    // FIRST: GEMINI
    // -------------------------------------------------------

    if (geminiKey) {
      try {
        result =
          await askGemini();
      } catch (error) {
        console.error(
          "GEMINI FAILED:",
          error?.message
        );
      }
    }

    // -------------------------------------------------------
    // SECOND: OPENROUTER
    // -------------------------------------------------------

    if (!result && openRouterKey) {
      try {
        result =
          await askOpenRouter();
      } catch (error) {
        console.error(
          "OPENROUTER FAILED:",
          error?.message
        );
      }
    }

    // =======================================================
    // BOTH FAILED
    // =======================================================

    if (!result) {
      return res.status(503).json({
        success: false,

        error:
          "⚠️ هەردوو سیستەمی زیرەک لە ئێستادا بەردەست نین. تکایە دووبارە هەوڵ بدە.",

        geminiConnected:
          Boolean(geminiKey),

        openRouterConnected:
          Boolean(openRouterKey),

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
    // FINAL RESPONSE
    // =======================================================

    return res.status(200).json({
      success: true,

      answer:
        result.answer,

      provider:
        result.provider,

      model:
        result.model,

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
