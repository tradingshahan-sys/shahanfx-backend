// api/chat.js
// ============================================================
// ShahanFX AI Pro Backend
// Kurdish Sorani + Live Market + Economic News + Chart Image
// Gemini Multi-Key Failover + OpenRouter Fallback
// ============================================================

export default async function handler(req, res) {
  // ==========================================================
  // CORS
  // ==========================================================
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.setHeader("Cache-Control", "no-store");

  // ==========================================================
  // OPTIONS
  // ==========================================================
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // ==========================================================
  // HEALTH CHECK
  // ==========================================================
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      success: true,
      project: "ShahanFX AI Pro",
      status: "online",
      live: true,
      version: "3.0",
      message: "ShahanFX Backend is working!"
    });
  }

  // ==========================================================
  // METHOD CHECK
  // ==========================================================
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "تەنها POST ڕێگەپێدراوە."
    });
  }

  // ==========================================================
  // ENVIRONMENT VARIABLES
  // ==========================================================

  const GEMINI_KEYS = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY1,
    process.env.GEMINI_API_KEY2
  ].filter(
    (key) =>
      typeof key === "string" &&
      key.trim().length > 0
  );

  const OPENROUTER_API_KEY =
    process.env.OPENROUTER_API_KEY;

  const TWELVE_DATA_API_KEY =
    process.env.TWELVE_DATA_API_KEY;

  // ==========================================================
  // REQUEST BODY
  // ==========================================================

  let body = {};

  try {
    body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};
  } catch {
    return res.status(400).json({
      ok: false,
      error: "داتای نێردراو دروست نییە."
    });
  }

  // ==========================================================
  // MESSAGE
  // ==========================================================

  const message =
    typeof body.message === "string"
      ? body.message.trim()
      : "";

  // ==========================================================
  // IMAGE
  // ==========================================================

  const image =
    typeof body.image === "string"
      ? body.image
      : null;

  // ==========================================================
  // SYMBOL
  // ==========================================================

  const symbol =
    typeof body.symbol === "string" &&
    body.symbol.trim()
      ? body.symbol.trim()
      : "XAU/USD";

  // ==========================================================
  // TIMEFRAME
  // ==========================================================

  const interval =
    typeof body.interval === "string" &&
    body.interval.trim()
      ? body.interval.trim()
      : "5min";

  // ==========================================================
  // VALIDATION
  // ==========================================================

  if (!message && !image) {
    return res.status(400).json({
      ok: false,
      error:
        "تکایە پرسیارێک بنووسە یان وێنەی Chart بنێرە."
    });
  }

  // ==========================================================
  // GLOBAL TIME LIMIT
  // ==========================================================

  const startedAt = Date.now();

  // Vercel-friendly total execution window
  const MAX_TIME = 24000;

  function remainingTime() {
    return Math.max(
      1000,
      MAX_TIME - (Date.now() - startedAt)
    );
  }

  // ==========================================================
  // FETCH WITH TIMEOUT
  // ==========================================================

  async function fetchTimeout(
    url,
    options = {},
    timeout = 8000
  ) {
    const controller =
      new AbortController();

    const safeTimeout = Math.min(
      timeout,
      remainingTime()
    );

    const timer = setTimeout(() => {
      controller.abort();
    }, safeTimeout);

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }
  }

  // ==========================================================
  // CLEAN AI TEXT
  // ==========================================================

  function clean(text) {
    if (!text) return "";

    return String(text)
      .replace(/User Safety:\s*safe/gi, "")
      .replace(/^System:\s*/i, "")
      .trim();
  }

  // ==========================================================
  // GET LIVE MARKET DATA
  // ==========================================================

  async function getMarket() {
    if (!TWELVE_DATA_API_KEY) {
      return {
        available: false,
        reason:
          "TWELVE_DATA_API_KEY نەدۆزرایەوە.",
        candles: []
      };
    }

    try {
      const url =
        "https://api.twelvedata.com/time_series" +
        `?symbol=${encodeURIComponent(symbol)}` +
        `&interval=${encodeURIComponent(interval)}` +
        "&outputsize=120" +
        `&apikey=${encodeURIComponent(
          TWELVE_DATA_API_KEY
        )}`;

      const response =
        await fetchTimeout(
          url,
          {
            headers: {
              Accept:
                "application/json"
            }
          },
          6500
        );

      const data =
        await response.json();

      if (!response.ok) {
        return {
          available: false,
          reason:
            `Market API HTTP ${response.status}`,
          candles: []
        };
      }

      if (
        !data ||
        !Array.isArray(data.values)
      ) {
        return {
          available: false,
          reason:
            data?.message ||
            "داتای بازاڕ بەردەست نییە.",
          candles: []
        };
      }

      const candles =
        data.values;

      if (candles.length === 0) {
        return {
          available: false,
          reason:
            "هیچ کاندڵێک نەدۆزرایەوە.",
          candles: []
        };
      }

      const current =
        candles[0];

      const previous =
        candles[1] ||
        candles[0];

      const currentClose =
        Number(current.close);

      const previousClose =
        Number(previous.close);

      let direction =
        "neutral";

      if (
        Number.isFinite(
          currentClose
        ) &&
        Number.isFinite(
          previousClose
        )
      ) {
        if (
          currentClose >
          previousClose
        ) {
          direction =
            "bullish";
        } else if (
          currentClose <
          previousClose
        ) {
          direction =
            "bearish";
        }
      }

      const recentCandles =
        candles
          .slice(0, 30)
          .map((c) => ({
            datetime:
              c.datetime,

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

      return {
        available: true,

        symbol,

        interval,

        current: {
          datetime:
            current.datetime,

          open:
            Number(current.open),

          high:
            Number(current.high),

          low:
            Number(current.low),

          close:
            Number(current.close)
        },

        previous: {
          datetime:
            previous.datetime,

          open:
            Number(previous.open),

          high:
            Number(previous.high),

          low:
            Number(previous.low),

          close:
            Number(previous.close)
        },

        direction,

        recentCandles
      };
    } catch (error) {
      return {
        available: false,

        reason:
          error?.name ===
          "AbortError"
            ? "Market API timeout"
            : error?.message ||
              "Market API error",

        candles: []
      };
    }
  }

  // ==========================================================
  // ECONOMIC NEWS
  // ==========================================================

  async function getNews() {
    try {
      const now =
        new Date();

      const year =
        now.getUTCFullYear();

      const month =
        String(
          now.getUTCMonth() + 1
        ).padStart(2, "0");

      const day =
        String(
          now.getUTCDate()
        ).padStart(2, "0");

      const today =
        `${year}-${month}-${day}`;

      const futureDate =
        new Date(
          now.getTime() +
            7 *
              24 *
              60 *
              60 *
              1000
        );

      const futureYear =
        futureDate.getUTCFullYear();

      const futureMonth =
        String(
          futureDate.getUTCMonth() + 1
        ).padStart(2, "0");

      const futureDay =
        String(
          futureDate.getUTCDate()
        ).padStart(2, "0");

      const to =
        `${futureYear}-${futureMonth}-${futureDay}`;

      const url =
        "https://xoomar.com/api/markets/calendar" +
        `?from=${encodeURIComponent(today)}` +
        `&to=${encodeURIComponent(to)}` +
        "&importance=high";

      const response =
        await fetchTimeout(
          url,
          {
            headers: {
              Accept:
                "application/json"
            }
          },
          6500
        );

      const data =
        await response.json();

      if (!response.ok) {
        return {
          available: false,

          reason:
            `Xoomar News API HTTP ${response.status}`,

          events: []
        };
      }

      const rawEvents =
        Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : [];

      if (
        !Array.isArray(
          rawEvents
        )
      ) {
        return {
          available: false,

          reason:
            "Xoomar Economic Calendar داتای دروستی نەگەڕاندەوە.",

          events: []
        };
      }

      const importantKeywords = [
        "cpi",
        "nfp",
        "fomc",
        "fed",
        "ppi",
        "gdp",
        "interest rate",
        "interest",
        "nonfarm",
        "inflation",
        "unemployment",
        "retail sales",
        "ism",
        "employment",
        "jobs",
        "payroll"
      ];

      const events =
        rawEvents
          .map((item) => ({
            date:
              item.scheduledAt ||
              item.datetime ||
              item.date ||
              null,

            country:
              item.country ||
              item.countryName ||
              "United States",

            event:
              item.eventName ||
              item.event ||
              item.name ||
              item.title ||
              "",

            impact:
              item.importance ||
              item.impact ||
              "high",

            actual:
              item.actual ??
              null,

            estimate:
              item.estimate ??
              item.forecast ??
              null,

            previous:
              item.previous ??
              null,

            period:
              item.periodLabel ||
              item.period ||
              null
          }))
          .filter((item) => {
            const country =
              String(
                item.country ||
                  ""
              ).toLowerCase();

            const eventName =
              String(
                item.event ||
                  ""
              ).toLowerCase();

            const isUS =
              country.includes(
                "united states"
              ) ||
              country === "us" ||
              country === "usa";

            const isImportant =
              importantKeywords.some(
                (keyword) =>
                  eventName.includes(
                    keyword
                  )
              );

            return (
              isUS ||
              isImportant
            );
          })
          .slice(0, 50);

      return {
        available: true,

        date: today,

        from: today,

        to,

        source:
          "Xoomar",

        provider:
          "Xoomar Pulse",

        events
      };
    } catch (error) {
      return {
        available: false,

        reason:
          error?.name ===
          "AbortError"
            ? "Xoomar News API timeout"
            : error?.message ||
              "Xoomar News API error",

        events: []
      };
    }
  }

  // ==========================================================
  // LIVE DATA
  // ==========================================================

  const [
    marketResult,
    newsResult
  ] =
    await Promise.allSettled([
      getMarket(),
      getNews()
    ]);

  const market =
    marketResult.status ===
    "fulfilled"
      ? marketResult.value
      : {
          available: false,
          reason:
            "Market data error",
          candles: []
        };

  const news =
    newsResult.status ===
    "fulfilled"
      ? newsResult.value
      : {
          available: false,
          reason:
            "News data error",
          events: []
        };

  const liveContext = {
    symbol,
    interval,

    market,

    news,

    dataPolicy: {
      liveDataOnly: true,
      doNotInventPrice: true,
      doNotInventNews: true,
      doNotClaimCertainty: true
    }
  };

  // ==========================================================
  // SYSTEM PROMPT
  // ==========================================================

  const systemPrompt = `
تۆ ShahanFX AI ـیت، ڕاوێژکاری پیشەیی بۆ Forex، Gold، ICT، SMC و ALC™.

━━━━━━━━━━━━━━━━━━━━
یاسای زمانی
━━━━━━━━━━━━━━━━━━━━

هەموو وەڵامەکەت بە کوردیی سۆرانی بنووسە.

دەقی شیکردنەوە و ڕوونکردنەوە بە کوردی بێت.

تەنها وشە تەکنیکییە پێویستەکان دەتوانن بە ئینگلیزی بمێنن:

Forex
Gold
XAU/USD
ICT
SMC
ALC™
FVG
BOS
CHOCH
Liquidity
Order Block
Breaker Block
Fair Value Gap
Entry
Stop Loss
Take Profit
Risk/Reward
BUY
SELL
WAIT

━━━━━━━━━━━━━━━━━━━━
داتای ڕاستەوخۆ
━━━━━━━━━━━━━━━━━━━━

تەنها ئەو داتایە بەکاربهێنە کە لە live context ـەوە دراوە.

نرخی ساختە مەدۆزەوە.

هەواڵی ساختە مەدۆزەوە.

کاتی ساختە مەدۆزەوە.

ئەگەر داتای بازاڕ بەردەست نەبوو بڵێ:

"داتای ڕاستەوخۆی بازاڕ بەردەست نییە، بۆیە ناتوانم نرخی ئێستا بە دڵنیایی دیاری بکەم."

ئەگەر هەواڵ بەردەست نەبوو، هیچ هەواڵێکی خۆت مەدروستکە.

━━━━━━━━━━━━━━━━━━━━
شیکردنەوە
━━━━━━━━━━━━━━━━━━━━

کاتێک بەکارهێنەر داوای شیکردنەوەی Chart یان Trade دەکات، ئەمانە لەبەرچاو بگرە:

1. نرخی ئێستا
2. ئاڕاستەی کاندڵ
3. Market Structure
4. BOS
5. CHOCH
6. Liquidity
7. Order Block
8. FVG
9. ICT
10. SMC
11. ALC™
12. هەواڵە گرنگەکان
13. Entry
14. Stop Loss
15. Take Profit
16. Risk/Reward
17. Confirmation

━━━━━━━━━━━━━━━━━━━━
ALC™
━━━━━━━━━━━━━━━━━━━━

ALC™ سیستەمێکی جیاوازە.

ALC™ بە ICT یان SMC تێکەڵ مەکە.

ئەگەر باس لە ALC™ کرا، شیکردنەوەی تایبەتی ALC™ بدە.

━━━━━━━━━━━━━━━━━━━━
BUY / SELL / WAIT
━━━━━━━━━━━━━━━━━━━━

هیچکات مەڵێ:

"100% دڵنیام."

یان:

"ئەم Trade ـە حەتمەن دەباتەوە."

BUY یان SELL تەنها کاتێک پێشنیار بکە کە Confirmation ـی گونجاو هەبێت.

ئەگەر Setup تەواو نەبوو:

WAIT

بەکاربهێنە.

━━━━━━━━━━━━━━━━━━━━
شێوازی وەڵام
━━━━━━━━━━━━━━━━━━━━

ئەگەر بەکارهێنەر شیکردنەوەی Trade یان Chart داوا کرد و داتا بەردەست بوو:

📊 بازاڕ:
[Symbol]

⏱ کاتی Chart:
[Timeframe]

💵 نرخی ئێستا:
[نرخ]

📈 ئاڕاستەی بازاڕ:
[Bullish / Bearish / Neutral]

🧱 پێکهاتەی بازاڕ:
[شیکردنەوە]

💧 Liquidity:
[شیکردنەوە]

🟦 Order Block:
[شیکردنەوە]

🟨 FVG:
[شیکردنەوە]

🧠 ICT / SMC:
[شیکردنەوە]

⚡ ALC™:
[شیکردنەوە]

📰 کاریگەری هەواڵ:
[شیکردنەوە]

🎯 Setup:
[شیکردنەوە]

📍 Entry:
[نرخ، تەنها ئەگەر داتا ڕێگە بدات]

🛑 Stop Loss:
[نرخ، تەنها ئەگەر داتا ڕێگە بدات]

💰 Take Profit:
[نرخ، تەنها ئەگەر داتا ڕێگە بدات]

⚖️ Risk/Reward:
[ڕێژە]

🔎 Confirmation:
[هۆکار]

🧠 ڕێژەی دڵنیایی:
[ژمارەی گونجاو، نەک 100%]

⏳ بڕیار:
[BUY / SELL / WAIT]

━━━━━━━━━━━━━━━━━━━━
یاسای کۆتایی
━━━━━━━━━━━━━━━━━━━━

پێش ناردنی وەڵام:

- هەموو شیکردنەوە بە کوردیی سۆرانی بێت.
- نرخی ساختە دروست مەکە.
- هەواڵی ساختە دروست مەکە.
- BUY/SELL بەبێ Confirmation مەدە.
- ALC™ لە ICT و SMC جیا بکەوە.
- وەڵامەکە ڕوون، سروشتی و پیشەیی بێت.
`;

  // ==========================================================
  // GEMINI MODEL LIST
  // ==========================================================

  const GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite"
  ];

  // ==========================================================
  // BUILD GEMINI CONTENT
  // ==========================================================

  function buildGeminiParts() {
    const parts = [];

    parts.push({
      text:
        "داتای ڕاستەوخۆی ShahanFX:\n\n" +
        JSON.stringify(
          liveContext,
          null,
          2
        )
    });

    parts.push({
      text:
        "\n\nپرسیاری بەکارهێنەر:\n" +
        (
          message ||
          "ئەم Chart ـە بە وردی بە کوردیی سۆرانی شیکاربکە."
        )
    });

    // ========================================================
    // IMAGE
    // ========================================================

    if (image) {
      const match =
        image.match(
          /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
        );

      if (match) {
        parts.push({
          inline_data: {
            mime_type:
              match[1],
            data:
              match[2]
          }
        });
      }
    }

    return parts;
  }

  // ==========================================================
  // GEMINI CALL
  // ==========================================================

  async function callGemini() {
    if (
      GEMINI_KEYS.length === 0
    ) {
      return null;
    }

    const parts =
      buildGeminiParts();

    // Try every API key
    for (
      let keyIndex = 0;
      keyIndex <
      GEMINI_KEYS.length;
      keyIndex++
    ) {
      const apiKey =
        GEMINI_KEYS[keyIndex];

      // Try every supported model
      for (
        let modelIndex = 0;
        modelIndex <
        GEMINI_MODELS.length;
        modelIndex++
      ) {
        if (
          remainingTime() <=
          3500
        ) {
          return null;
        }

        const model =
          GEMINI_MODELS[
            modelIndex
          ];

        try {
          const url =
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
            `?key=${encodeURIComponent(
              apiKey
            )}`;

          const response =
            await fetchTimeout(
              url,
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body:
                  JSON.stringify({
                    system_instruction: {
                      parts: [
                        {
                          text:
                            systemPrompt
                        }
                      ]
                    },

                    contents: [
                      {
                        role:
                          "user",

                        parts
                      }
                    ],

                    generationConfig: {
                      maxOutputTokens:
                        2200,

                      temperature:
                        0.3
                    }
                  })
              },

              Math.min(
                7000,
                remainingTime()
              )
            );

          let data = null;

          try {
            data =
              await response.json();
          } catch {
            data = null;
          }

          // =================================================
          // SUCCESS
          // =================================================

          if (
            response.ok
          ) {
            const text =
              data
                ?.candidates?.[0]
                ?.content?.parts
                ?.map(
                  (part) =>
                    part.text ||
                    ""
                )
                .join("")
                .trim();

            if (text) {
              return {
                provider:
                  "gemini",

                model,

                key:
                  `GEMINI_API_KEY${
                    keyIndex === 0
                      ? ""
                      : keyIndex
                  }`,

                answer:
                  clean(text)
              };
            }
          }

          // =================================================
          // CONTINUE
          // =================================================

        } catch {
          // Try next model / next API key
        }
      }
    }

    return null;
  }

  // ==========================================================
  // OPENROUTER FALLBACK
  // ==========================================================

  async function callOpenRouter() {
    if (
      !OPENROUTER_API_KEY
    ) {
      return null;
    }

    if (
      remainingTime() <=
      3000
    ) {
      return null;
    }

    try {
      const userContent =
        [
          "داتای ڕاستەوخۆی ShahanFX:",
          JSON.stringify(
            liveContext,
            null,
            2
          ),

          "",

          "پرسیاری بەکارهێنەر:",
          (
            message ||
            "ئەم Chart ـە بە وردی بە کوردیی سۆرانی شیکاربکە."
          )
        ].join("\n");

      const response =
        await fetchTimeout(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${OPENROUTER_API_KEY}`,

              "HTTP-Referer":
                "https://shahanfx-backend-9576.vercel.app",

              "X-Title":
                "ShahanFX AI Pro"
            },

            body:
              JSON.stringify({
                model:
                  "openrouter/free",

                messages: [
                  {
                    role:
                      "system",

                    content:
                      systemPrompt
                  },

                  {
                    role:
                      "system",

                    content:
                      "وەڵامی کۆتایی تەنها بە کوردیی سۆرانی بێت، جگە لە وشە تەکنیکییە پێویستەکان."
                  },

                  {
                    role:
                      "user",

                    content:
                      userContent
                  }
                ],

                max_tokens:
                  2200,

                temperature:
                  0.3
              })
          },

          Math.min(
            8000,
            remainingTime()
          )
        );

      let data = null;

      try {
        data =
          await response.json();
      } catch {
        data = null;
      }

      if (
        !response.ok
      ) {
        return null;
      }

      const text =
        data
          ?.choices?.[0]
          ?.message
          ?.content
          ?.trim();

      if (!text) {
        return null;
      }

      return {
        provider:
          "openrouter",

        model:
          data?.model ||
          "openrouter/free",

        answer:
          clean(text)
      };
    } catch {
      return null;
    }
  }

  // ==========================================================
  // AI EXECUTION
  // ==========================================================

  let aiResult =
    await callGemini();

  // Gemini failed → OpenRouter
  if (!aiResult) {
    aiResult =
      await callOpenRouter();
  }

  // ==========================================================
  // AI FAILURE
  // ==========================================================

  if (!aiResult) {
    return res.status(503).json({
      ok: false,

      success: false,

      error:
        "هیچ یەکێک لە سیستەمەکانی AI وەڵامی نەدا. تکایە دووبارە هەوڵ بدەوە.",

      diagnostics: {
        geminiKeys:
          GEMINI_KEYS.length,

        openrouter:
          Boolean(
            OPENROUTER_API_KEY
          ),

        market:
          Boolean(
            market?.available
          ),

        news:
          Boolean(
            news?.available
          )
      },

      liveData: {
        market:
          market?.available ===
          true,

        news:
          news?.available ===
          true
      }
    });
  }

  // ==========================================================
  // FINAL RESPONSE
  // ==========================================================

  return res.status(200).json({
    ok: true,

    success: true,

    answer:
      aiResult.answer,

    provider:
      aiResult.provider,

    model:
      aiResult.model,

    image:
      Boolean(image),

    liveData: true,

    market: {
      available:
        Boolean(
          market?.available
        ),

      symbol,

      interval,

      direction:
        market?.direction ||
        "neutral",

      currentPrice:
        market?.current
          ?.close ??
        null,

      datetime:
        market?.current
          ?.datetime ??
        null
    },

    news: {
      available:
        Boolean(
          news?.available
        ),

      events:
        Array.isArray(
          news?.events
        )
          ? news.events
          : []
    }
  });
}
