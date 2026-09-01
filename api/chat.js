export default async function handler(req, res) {

  // =========================================================
  // SHAHANFX AI PRO
  // GEMINI + OPENROUTER FALLBACK
  // MARKET + NEWS + ICT + SMC
  // KURDISH SORANI ONLY
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

    const geminiKey =
      process.env.GEMINI_API_KEY;

    const openRouterKey =
      process.env.OPENROUTER_API_KEY;

    const twelveKey =
      process.env.TWELVE_DATA_API_KEY;

    const fmpKey =
      process.env.FMP_API_KEY;

    // =======================================================
    // INPUT
    // =======================================================

    const input =
      req.method === "GET"
        ? (req.query || {})
        : (req.body || {});

    const action =
      String(input.action || "")
        .toLowerCase()
        .trim();

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

    const today =
      new Date();

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
    // MARKET DATA
    // =======================================================

    let marketData = {
      success: false,
      error: "داتای بازاڕ بەردەست نییە."
    };

    if (twelveKey) {

      try {

        const url =
          new URL(
            "https://api.twelvedata.com/time_series"
          );

        url.searchParams.set(
          "symbol",
          finalSymbol
        );

        url.searchParams.set(
          "interval",
          safeInterval
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
          await fetch(url.toString());

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

          if (
            current &&
            previous
          ) {

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
              "داتای بازاڕ نەهێنرا."
          };
        }

      } catch (error) {

        console.error(
          "MARKET ERROR:",
          error
        );

        marketData = {
          success: false,
          error:
            "هەڵە لە داتای بازاڕ."
        };
      }
    }

    // =======================================================
    // NEWS DATA
    // =======================================================

    let newsData = {
      success: false,
      error: "داتای هەواڵ بەردەست نییە."
    };

    if (fmpKey) {

      try {

        const url =
          new URL(
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

        if (response.ok) {

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
                country === "UNITED STATES"
              );
            });

          const normalize =
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
            usEvents.map(normalize);

          const important =
            normalized.filter(event => {

              const name =
                String(
                  event.event || ""
                ).toLowerCase();

              const keys = [
                "cpi",
                "consumer price index",
                "non farm",
                "non-farm",
                "nonfarm",
                "payroll",
                "nfp",
                "fomc",
                "federal funds",
                "interest rate",
                "ppi",
                "producer price",
                "gdp",
                "unemployment",
                "jobless claims",
                "retail sales",
                "ism",
                "pmi",
                "powell",
                "federal reserve",
                "fed"
              ];

              return keys.some(
                key =>
                  name.includes(key)
              );
            });

          const cpi =
            normalized.filter(event =>
              String(event.event || "")
                .toLowerCase()
                .includes("cpi")
              ||
              String(event.event || "")
                .toLowerCase()
                .includes(
                  "consumer price index"
                )
            );

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

        } else {

          newsData = {
            success: false,
            error:
              data?.message ||
              "هەڵە لە FMP."
          };
        }

      } catch (error) {

        console.error(
          "NEWS ERROR:",
          error
        );

        newsData = {
          success: false,
          error:
            "هەڵە لە داتای هەواڵ."
        };
      }
    }

    // =======================================================
    // DIRECT ACTIONS
    // =======================================================

    if (action === "market") {

      return res.status(200).json({
        success:
          marketData.success,

        type: "market",

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

    if (action === "news") {

      return res.status(200).json({

        success:
          newsData.success,

        type: "news",

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

    if (action === "cpi") {

      return res.status(200).json({

        success:
          newsData.success,

        type: "cpi",

        source:
          newsData.source || null,

        date:
          todayString,

        cpi:
          newsData.cpi || []
      });
    }

    // =======================================================
    // USER INPUT
    // =======================================================

    const image =
      input.image || null;

    if (
      !message &&
      !(
        image &&
        image.data &&
        image.mimeType
      )
    ) {

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
        marketData.candles
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
      newsData?.cpi || [];

    const nfp =
      newsData?.nfp || [];

    const fomc =
      newsData?.fomc || [];

    const ppi =
      newsData?.ppi || [];

    const importantNews =
      newsData?.importantNews || [];

    // =======================================================
    // STRONG KURDISH SYSTEM PROMPT
    // =======================================================

    const systemPrompt = `

تۆ "ShahanFX AI Pro" ـیت.

ئەرکی تۆ یارمەتیدانی بەکارهێنەرە لە:
Forex، XAU/USD، ICT، SMC، Price Action،
Market Structure، Liquidity و Risk Management.

========================================================
یاسای زمانی زۆر گرنگ
========================================================

هەموو وەڵامەکەت دەبێت بە کوردی سۆرانی بێت.

تەنها ئەم وشانە دەتوانیت بە ئینگلیزی بهێڵیت چونکە
ناوی زانستی/بازاڕین:

XAU/USD
Forex
ICT
SMC
FVG
BOS
CHOCH
HH
HL
LH
LL
BSL
SSL
Order Block
Liquidity Sweep
Premium
Discount
Equilibrium
BUY
SELL
WAIT
TP
SL
Entry
Risk/Reward

هەموو ڕستە و ڕوونکردنەوەکان بە کوردی سۆرانی بن.

وشەی ئینگلیزیی زیاتر بەکارمەهێنە ئەگەر هاوتای
کوردیی ڕوون هەبێت.

هیچ وەڵامێک بە ئینگلیزی مەنووسە.

ئەگەر پرسیارەکە بە ئینگلیزی بوو،
هەر بە کوردی سۆرانی وەڵامی بدە.

"User Safety: safe"
یان هیچ دەقی نامۆی سیستەم مەنووسە.

========================================================
داتا
========================================================

تەنها ئەو داتایە بەکاربهێنە کە لە LIVE CONTEXT ـدا هاتووە.

هیچ نرخێک مەخەڵقە.

هیچ هەواڵێک مەخەڵقە.

هیچ CPI/NFP/FOMC/PPI ـێک مەخەڵقە.

ئەگەر داتا بەردەست نییە،
بڵێ:

"داتای ڕاستەوخۆی ئەم بەشە بەردەست نییە."

========================================================
شیکردنەوەی XAU/USD
========================================================

ئەگەر بەکارهێنەر داوای شیکردنەوەی XAU/USD کرد،
ئەمانە پشکنە:

1. ئاراستەی بازاڕ
2. Market Structure
3. HH / HL / LH / LL
4. BOS
5. CHOCH
6. Liquidity
7. Liquidity Sweep
8. FVG
9. Order Block
10. Candle Reaction
11. News
12. Setup

========================================================
NEWS
========================================================

ئەگەر CPI/NFP/FOMC/PPI داتا نییە،
بە ڕوونی بڵێ:

"داتای ڕاستەوخۆی هەواڵ بەردەست نییە."

هیچ داتای Actual/Forecast/Previous مەخەڵقە.

========================================================
TRADE FORMAT
========================================================

ئەگەر شیکردنەوەی Trade داواکرا:

📊 SHAHANFX AI PRO

🥇 Symbol:
⏱ Timeframe:
💰 نرخی ئێستا:

📰 هەواڵ:
📊 Actual:
📊 Forecast:
📊 Previous:

⚡ کاریگەری هەواڵ:

📈 ئاراستەی بازاڕ:

🏗 Market Structure:

🔥 BOS / CHOCH:

💧 Liquidity:

📦 FVG:

🧱 Order Block:

🕯 کاردانەوەی مۆم:

🎯 Setup:

📍 Entry:

🛑 Invalidation:

🎯 TP:

⚖️ Risk/Reward:

🧠 Confidence:

========================================================
RISK
========================================================

هیچ Trade ـێک 100% دڵنیایی نییە.

ئەگەر Balance و Risk % نییە،
Lot Size مەحسابە.

========================================================
WAIT
========================================================

ئەگەر Structure ڕوون نییە،
Confirmation نییە،
News زۆر نزیکە،
یان Volatility زۆر بەرزە،

→ WAIT

پێشنیاری BUY یان SELL بەبێ Confirmation مەدە.

========================================================
کۆتایی
========================================================

وەڵامەکەت کورت، ڕوون، ڕێکخراو و بە کوردی سۆرانی بێت.
`;

    // =======================================================
    // LIVE CONTEXT
    // =======================================================

    const liveContext = `

================ داتای ڕاستەوخۆی بازاڕ ================

سەرچاوە:
${marketData?.source || "بەردەست نییە"}

Symbol:
${marketData?.symbol || finalSymbol}

Timeframe:
${marketData?.interval || safeInterval}

نرخی ئێستا:
${currentPrice ?? "بەردەست نییە"}

ئاراستە:
${direction}

کاندڵەکان:
${JSON.stringify(
  candles.slice(0, 100),
  null,
  2
)}

================ هەواڵ ================

سەرچاوە:
${newsData?.source || "بەردەست نییە"}

هەواڵی گرنگ:
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
    // GEMINI REQUEST
    // =======================================================

    async function callGemini() {

      if (!geminiKey) {
        throw new Error(
          "GEMINI_API_KEY نییە."
        );
      }

      const models = [
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-3.5-flash"
      ];

      for (const model of models) {

        try {

          const endpoint =
            "https://generativelanguage.googleapis.com/v1beta/models/" +
            model +
            ":generateContent?key=" +
            encodeURIComponent(
              geminiKey
            );

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
                  part =>
                    part.text || ""
                )
                .join("")
                .trim();

            if (answer) {

              return {
                answer,
                model
              };
            }
          }

          console.error(
            "Gemini failed:",
            model,
            data?.error?.message
          );

        } catch (error) {

          console.error(
            "Gemini exception:",
            error.message
          );
        }
      }

      throw new Error(
        "Gemini بەردەست نییە."
      );
    }

    // =======================================================
    // OPENROUTER REQUEST
    // =======================================================

    async function callOpenRouter() {

      if (!openRouterKey) {
        throw new Error(
          "OPENROUTER_API_KEY نییە."
        );
      }

      const models = [

        "openai/gpt-oss-20b:free",
        "meta-llama/llama-3.3-8b-instruct:free",
        "google/gemma-3-27b-it:free"

      ];

      for (const model of models) {

        try {

          const content = [];

          content.push({
            type: "text",
            text:
              systemPrompt +
              liveContext
          });

          if (
            image &&
            image.data &&
            image.mimeType
          ) {

            content.push({
              type: "image_url",
              image_url: {
                url:
                  `data:${image.mimeType};base64,${image.data}`
              }
            });
          }

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
                    "https://shahanfx.com",

                  "X-Title":
                    "ShahanFX AI"
                },

                body:
                  JSON.stringify({

                    model,

                    messages: [

                      {
                        role: "system",

                        content:
                          systemPrompt
                      },

                      {
                        role: "user",

                        content
                      }

                    ],

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
                ?.message
                ?.content
                ?.trim();

            if (answer) {

              return {
                answer,
                model
              };
            }
          }

          console.error(
            "OpenRouter failed:",
            model,
            data?.error?.message
          );

        } catch (error) {

          console.error(
            "OpenRouter exception:",
            error.message
          );
        }
      }

      throw new Error(
        "OpenRouter بەردەست نییە."
      );
    }

    // =======================================================
    // AI FALLBACK SYSTEM
    // =======================================================

    let result = null;
    let provider = null;
    let lastError = null;

    // -------------------------------------------------------
    // 1. Gemini
    // -------------------------------------------------------

    try {

      result =
        await callGemini();

      provider =
        "Gemini";

    } catch (error) {

      lastError =
        error;

      console.log(
        "Gemini نەیتوانی وەڵام بدات، دەچین بۆ OpenRouter."
      );
    }

    // -------------------------------------------------------
    // 2. OpenRouter
    // -------------------------------------------------------

    if (!result) {

      try {

        result =
          await callOpenRouter();

        provider =
          "OpenRouter";

      } catch (error) {

        lastError =
          error;
      }
    }

    // =======================================================
    // BOTH FAILED
    // =======================================================

    if (!result) {

      console.error(
        "ALL AI PROVIDERS FAILED:",
        lastError
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
    // CLEAN ANSWER
    // =======================================================

    let answer =
      String(
        result.answer || ""
      ).trim();

    // -------------------------------------------------------
    // Remove accidental safety/system lines
    // -------------------------------------------------------

    answer =
      answer
        .replace(
          /^User Safety:\s*safe\s*$/gim,
          ""
        )
        .replace(
          /^System:\s*.*$/gim,
          ""
        )
        .trim();

    // =======================================================
    // FINAL RESPONSE
    // =======================================================

    return res.status(200).json({

      success: true,

      answer,

      provider,

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
