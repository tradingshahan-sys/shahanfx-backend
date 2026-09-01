// api/chat.js
// ShahanFX AI Pro — Live Market + Live News + Gemini + OpenRouter
// Vercel Node.js Serverless — Stable Version

export default async function handler(req, res) {
  // =====================================================
  // CORS / HEADERS
  // =====================================================

  try {
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

    // =====================================================
    // OPTIONS
    // =====================================================

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    // =====================================================
    // HEALTH CHECK
    // =====================================================

    if (req.method === "GET") {
      return res.status(200).json({
        ok: true,
        success: true,
        project: "ShahanFX AI Pro",
        status: "online",
        live: true,
        message: "ShahanFX Backend is working!"
      });
    }

    // =====================================================
    // METHOD CHECK
    // =====================================================

    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        success: false,
        error: "تەنها POST ڕێگەپێدراوە."
      });
    }

    // =====================================================
    // ENVIRONMENT VARIABLES
    // =====================================================

    const GEMINI_API_KEY =
      process.env.GEMINI_API_KEY || "";

    const OPENROUTER_API_KEY =
      process.env.OPENROUTER_API_KEY || "";

    const TWELVE_DATA_API_KEY =
      process.env.TWELVE_DATA_API_KEY || "";

    const FMP_API_KEY =
      process.env.FMP_API_KEY || "";

    // =====================================================
    // BODY
    // =====================================================

    let body = {};

    try {
      if (
        req.body &&
        typeof req.body === "object"
      ) {
        body = req.body;
      } else if (
        typeof req.body === "string"
      ) {
        body = JSON.parse(req.body);
      }
    } catch {
      body = {};
    }

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const image =
      typeof body.image === "string" &&
      body.image.startsWith("data:")
        ? body.image
        : null;

    const symbol =
      typeof body.symbol === "string" &&
      body.symbol.trim()
        ? body.symbol.trim()
        : "XAU/USD";

    const interval =
      typeof body.interval === "string" &&
      body.interval.trim()
        ? body.interval.trim()
        : (
            typeof body.timeframe === "string" &&
            body.timeframe.trim()
              ? body.timeframe.trim()
              : "5min"
          );

    // =====================================================
    // EMPTY REQUEST
    // =====================================================

    if (!message && !image) {
      return res.status(400).json({
        ok: false,
        success: false,
        error:
          "تکایە پرسیارێک بنووسە یان وێنەی Chart بنێرە."
      });
    }

    // =====================================================
    // TIME LIMIT
    // =====================================================

    const deadline =
      Date.now() + 23000;

    // =====================================================
    // SAFE FETCH
    // =====================================================

    async function fetchTimeout(
      url,
      options = {},
      timeout = 5000
    ) {
      const controller =
        new AbortController();

      const timer =
        setTimeout(
          () => controller.abort(),
          timeout
        );

      try {
        return await fetch(
          url,
          {
            ...options,
            signal:
              controller.signal
          }
        );
      } finally {
        clearTimeout(timer);
      }
    }

    // =====================================================
    // SAFE TEXT
    // =====================================================

    function clean(value) {
      if (
        value === null ||
        value === undefined
      ) {
        return "";
      }

      return String(value)
        .replace(
          /User Safety:\s*safe/gi,
          ""
        )
        .replace(
          /^System:\s*/gim,
          ""
        )
        .trim();
    }

    // =====================================================
    // LIVE MARKET
    // =====================================================

    async function getMarket() {
      if (!TWELVE_DATA_API_KEY) {
        return {
          available: false,
          reason:
            "Twelve Data API key بەردەست نییە."
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
            4500
          );

        let data = null;

        try {
          data =
            await response.json();
        } catch {
          return {
            available: false,
            reason:
              "Market API وەڵامی دروستی نەدا."
          };
        }

        if (
          !response.ok ||
          !data ||
          data.status === "error" ||
          !Array.isArray(data.values) ||
          data.values.length === 0
        ) {
          return {
            available: false,
            reason:
              data?.message ||
              "Market Data بەردەست نییە."
          };
        }

        const candles =
          data.values;

        const current =
          candles[0] || null;

        const previous =
          candles[1] || null;

        const currentClose =
          Number(current?.close);

        const previousClose =
          Number(previous?.close);

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

        return {
          available: true,
          symbol,
          interval,
          current,
          previous,
          candles,
          direction
        };

      } catch {
        return {
          available: false,
          reason:
            "کێشە لە وەرگرتنی Market Data."
        };
      }
    }

    // =====================================================
    // LIVE NEWS
    // =====================================================

    async function getNews() {
      if (!FMP_API_KEY) {
        return {
          available: false,
          reason:
            "FMP API key بەردەست نییە."
        };
      }

      try {
        const url =
          "https://financialmodelingprep.com/stable/economic-calendar" +
          `?apikey=${encodeURIComponent(
            FMP_API_KEY
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
            4500
          );

        let data = null;

        try {
          data =
            await response.json();
        } catch {
          return {
            available: false,
            reason:
              "News API وەڵامی دروستی نەدا."
          };
        }

        if (
          !response.ok ||
          !Array.isArray(data)
        ) {
          return {
            available: false,
            reason:
              "Economic Calendar بەردەست نییە."
          };
        }

        const keywords = [
          "CPI",
          "NFP",
          "FOMC",
          "FED",
          "PPI",
          "GDP",
          "INTEREST RATE",
          "NONFARM",
          "INFLATION",
          "UNEMPLOYMENT",
          "RETAIL SALES",
          "ISM"
        ];

        const events =
          data
            .filter(item => {
              const country =
                String(
                  item?.country || ""
                ).toUpperCase();

              const event =
                String(
                  item?.event || ""
                ).toUpperCase();

              const impact =
                String(
                  item?.impact ||
                  item?.importance ||
                  ""
                ).toUpperCase();

              return (
                country === "US" ||
                country === "USA" ||
                keywords.some(
                  keyword =>
                    event.includes(
                      keyword
                    )
                ) ||
                impact.includes(
                  "HIGH"
                ) ||
                impact.includes(
                  "IMPORTANT"
                )
              );
            })
            .slice(0, 40);

        return {
          available: true,
          events
        };

      } catch {
        return {
          available: false,
          reason:
            "کێشە لە وەرگرتنی News Data."
        };
      }
    }

    // =====================================================
    // LIVE DATA
    // =====================================================

    const results =
      await Promise.allSettled([
        getMarket(),
        getNews()
      ]);

    const market =
      results[0]?.status ===
      "fulfilled"
        ? results[0].value
        : {
            available: false,
            reason:
              "Market Data بەردەست نییە."
          };

    const news =
      results[1]?.status ===
      "fulfilled"
        ? results[1].value
        : {
            available: false,
            reason:
              "News Data بەردەست نییە."
          };

    // =====================================================
    // LIVE CONTEXT
    // =====================================================

    const liveContext = {
      symbol,
      interval,

      market:
        market.available
          ? {
              current:
                market.current,

              previous:
                market.previous,

              direction:
                market.direction,

              recentCandles:
                Array.isArray(
                  market.candles
                )
                  ? market.candles.slice(
                      0,
                      30
                    )
                  : []
            }
          : {
              unavailable: true,
              reason:
                market.reason
            },

      news:
        news.available
          ? {
              events:
                Array.isArray(
                  news.events
                )
                  ? news.events
                  : []
            }
          : {
              unavailable: true,
              reason:
                news.reason
            }
    };

    // =====================================================
    // SYSTEM PROMPT
    // =====================================================

    const systemPrompt = `
تۆ ShahanFX AI ـیت، ڕاوێژکاری پیشەیی بۆ Forex و Gold.

ALC™ سیستەمێکی جیاوازە لە ICT و SMC.
ALC™ و ICT و SMC بە شێوەی جیاواز لە شیکردنەوە بەکاربهێنە.

هەموو وەڵامەکەت بە کوردی سۆرانی بنووسە.

وشە تەکنیکییەکان دەتوانن بە English بمێننەوە:

Forex
Gold
ALC™
ICT
SMC
FVG
BOS
CHOCH
Liquidity
Order Block
Entry
Stop Loss
Take Profit
Risk/Reward
BUY
SELL
WAIT

━━━━━━━━━━━━━━━━━━━━━━
LIVE DATA
━━━━━━━━━━━━━━━━━━━━━━

تەنها ئەو نرخ و Candle و News ـە بەکاربهێنە
کە لە Live Context ـدا هەیە.

هیچ نرخێک لە خۆتەوە دروست مەکە.

هیچ News ـێک لە خۆتەوە دروست مەکە.

ئەگەر Live Data بەردەست نییە،
بە کوردی سۆرانی ڕوونی بکەوە.

بە داتای کۆن ناڵێ Live.

━━━━━━━━━━━━━━━━━━━━━━
MARKET ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━

ئەم خاڵانە هەڵسەنگێنە:

Price
Candle
Market Structure
HH
HL
LH
LL
Liquidity
BSL
SSL
Liquidity Sweep
BOS
CHOCH
FVG
Order Block
Premium
Discount
ALC™
ICT
SMC
News Impact

━━━━━━━━━━━━━━━━━━━━━━
TRADE RULES
━━━━━━━━━━━━━━━━━━━━━━

هیچ Trade ـێک بە دڵنیایی 100% مەدە.

ئەگەر Confirmation تەواو نییە:

WAIT

BUY یان SELL تەنها کاتێک پێشنیار بکە
کە Setup ـێکی ڕوون و پشتگیریکراو هەبێت.

ئەگەر Setup ـێکی ڕوون هەبوو:

📊 Symbol:
⏱ Timeframe:
📈 Bias:
🎯 Setup:
📍 Entry:
🛑 Stop Loss:
💰 Take Profit:
⚖️ Risk/Reward:
🔎 Confirmation:
📰 News:
🧠 Confidence:
⏳ Decision:

هەموو وەڵامەکان کورت، ڕوون و پیشەیی بن.

━━━━━━━━━━━━━━━━━━━━━━
LIVE CONTEXT
━━━━━━━━━━━━━━━━━━━━━━

${JSON.stringify(
  liveContext
)}
`;

    // =====================================================
    // IMAGE PARSER
    // =====================================================

    function parseDataUrl(dataUrl) {
      if (
        typeof dataUrl !== "string"
      ) {
        return null;
      }

      const match =
        dataUrl.match(
          /^data:([^;]+);base64,(.+)$/s
        );

      if (!match) {
        return null;
      }

      return {
        mime: match[1],
        data: match[2]
      };
    }

    // =====================================================
    // GEMINI
    // =====================================================

    async function callGemini() {
      if (
        !GEMINI_API_KEY ||
        Date.now() >= deadline
      ) {
        return null;
      }

      const models = [
        "gemini-3.7-flash",
        "gemini-3.6-flash"
      ];

      const parts = [
        {
          text:
            systemPrompt +
            "\n\nپرسیاری بەکارهێنەر:\n" +
            (
              message ||
              "ئەم Chart ـە بە وردی بە کوردی سۆرانی شیکاربکە."
            )
        }
      ];

      if (image) {
        const parsed =
          parseDataUrl(image);

        if (parsed) {
          parts.push({
            inline_data: {
              mime_type:
                parsed.mime,
              data:
                parsed.data
            }
          });
        }
      }

      for (const model of models) {
        if (
          Date.now() >= deadline
        ) {
          break;
        }

        try {
          const remaining =
            Math.max(
              2500,
              deadline -
                Date.now()
            );

          const url =
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
              GEMINI_API_KEY
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
                    contents: [
                      {
                        role:
                          "user",
                        parts
                      }
                    ],

                    generationConfig: {
                      maxOutputTokens:
                        2200
                    }
                  })
              },
              remaining
            );

          let data = null;

          try {
            data =
              await response.json();
          } catch {
            data = null;
          }

          const answer =
            data?.candidates?.[0]
              ?.content?.parts
              ?.map(
                item =>
                  typeof item?.text ===
                  "string"
                    ? item.text
                    : ""
              )
              .join("")
              .trim();

          if (
            response.ok &&
            answer
          ) {
            return {
              answer:
                clean(answer),

              provider:
                "Gemini",

              model
            };
          }

        } catch {
          // Continue
        }
      }

      return null;
    }

    // =====================================================
    // OPENROUTER
    // =====================================================

    async function callOpenRouter() {
      if (
        !OPENROUTER_API_KEY ||
        Date.now() >= deadline
      ) {
        return null;
      }

      try {
        const remaining =
          Math.max(
            2500,
            deadline -
              Date.now()
          );

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
                        "user",
                      content:
                        message ||
                        "ئەم Chart ـە بە وردی بە کوردی سۆرانی شیکاربکە."
                    }
                  ],

                  max_tokens:
                    2200
                })
            },
            remaining
          );

        let data = null;

        try {
          data =
            await response.json();
        } catch {
          data = null;
        }

        const answer =
          data?.choices?.[0]
            ?.message?.content;

        if (
          response.ok &&
          typeof answer ===
            "string" &&
          answer.trim()
        ) {
          return {
            answer:
              clean(answer),

            provider:
              "OpenRouter",

            model:
              data?.model ||
              "openrouter/free"
          };
        }

      } catch {
        // Safe fallback
      }

      return null;
    }

    // =====================================================
    // AI
    // =====================================================

    let ai = null;

    try {
      ai =
        await callGemini();

      if (!ai) {
        ai =
          await callOpenRouter();
      }
    } catch {
      ai = null;
    }

    // =====================================================
    // AI FAILURE
    // =====================================================

    if (!ai) {
      return res.status(503).json({
        ok: false,
        success: false,

        error:
          "⚠️ ShahanFX AI نەتوانی وەڵام بدات. تکایە Gemini یان OpenRouter و Quota ـەکان بپشکنە.",

        liveData: {
          market:
            Boolean(
              market?.available
            ),

          news:
            Boolean(
              news?.available
            )
        }
      });
    }

    // =====================================================
    // FINAL RESPONSE
    // =====================================================

    return res.status(200).json({
      ok: true,
      success: true,

      answer:
        ai.answer,

      provider:
        ai.provider,

      model:
        ai.model,

      hasImage:
        Boolean(image),

      liveData: {
        market:
          Boolean(
            market?.available
          ),

        news:
          Boolean(
            news?.available
          )
      },

      market:
        market?.available
          ? {
              symbol:
                market.symbol,

              interval:
                market.interval,

              direction:
                market.direction,

              current:
                market.current
            }
          : null,

      news:
        news?.available
          ? {
              count:
                Array.isArray(
                  news.events
                )
                  ? news.events.length
                  : 0
            }
          : null
    });

  } catch (error) {

    console.error(
      "ShahanFX AI Fatal Error:",
      error
    );

    return res.status(500).json({
      ok: false,
      success: false,
      error:
        "ShahanFX Backend هەڵەیەکی ناوخۆیی هەیە.",
      project:
        "ShahanFX AI Pro"
    });
  }
}
