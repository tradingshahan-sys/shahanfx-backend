// api/chat.js
// ShahanFX AI Pro — Kurdish Sorani + Live Market + Live News

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      success: true,
      project: "ShahanFX AI Pro",
      status: "online",
      live: true
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      success: false,
      error: "تەنها POST ڕێگەپێدراوە."
    });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;
  const FMP_API_KEY = process.env.FMP_API_KEY;

  const body = req.body || {};

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
      : "5min";

  if (!message && !image) {
    return res.status(400).json({
      ok: false,
      success: false,
      error: "تکایە پرسیارێک بنووسە یان وێنەی Chart بنێرە."
    });
  }

  const deadline = Date.now() + 24000;

  async function fetchTimeout(url, options = {}, timeout = 5000) {
    const controller = new AbortController();

    const timer = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }
  }

  function safe(value) {
    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "string") {
      return value;
    }

    if (Array.isArray(value)) {
      return value
        .map(safe)
        .filter(Boolean)
        .join("\n");
    }

    if (typeof value === "object") {
      if (typeof value.text === "string") {
        return value.text;
      }

      if (typeof value.content === "string") {
        return value.content;
      }

      try {
        return JSON.stringify(value);
      } catch {
        return "";
      }
    }

    return String(value);
  }

  function clean(value) {
    return safe(value)
      .replace(/User Safety:\s*safe/gi, "")
      .replace(/^System:\s*/gim, "")
      .trim();
  }

  // =====================================================
  // LIVE MARKET
  // =====================================================

  async function getMarket() {
    if (!TWELVE_DATA_API_KEY) {
      return {
        available: false,
        reason: "Twelve Data API key بەردەست نییە."
      };
    }

    try {
      const url =
        "https://api.twelvedata.com/time_series" +
        `?symbol=${encodeURIComponent(symbol)}` +
        `&interval=${encodeURIComponent(interval)}` +
        "&outputsize=120" +
        `&apikey=${encodeURIComponent(TWELVE_DATA_API_KEY)}`;

      const response = await fetchTimeout(
        url,
        {
          headers: {
            Accept: "application/json"
          }
        },
        5000
      );

      const data = await response.json();

      if (
        !response.ok ||
        data.status === "error" ||
        !Array.isArray(data.values) ||
        !data.values.length
      ) {
        return {
          available: false,
          reason: "Market Data بەردەست نییە."
        };
      }

      const candles = data.values;

      const current = candles[0];
      const previous = candles[1] || null;

      const currentClose = Number(current.close);
      const previousClose = previous
        ? Number(previous.close)
        : NaN;

      let direction = "neutral";

      if (
        Number.isFinite(currentClose) &&
        Number.isFinite(previousClose)
      ) {
        if (currentClose > previousClose) {
          direction = "bullish";
        } else if (currentClose < previousClose) {
          direction = "bearish";
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
        reason: "کێشە لە وەرگرتنی Market Data."
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
        reason: "FMP API key بەردەست نییە."
      };
    }

    try {
      const url =
        "https://financialmodelingprep.com/stable/economic-calendar" +
        `?apikey=${encodeURIComponent(FMP_API_KEY)}`;

      const response = await fetchTimeout(
        url,
        {
          headers: {
            Accept: "application/json"
          }
        },
        5000
      );

      const data = await response.json();

      if (
        !response.ok ||
        !Array.isArray(data)
      ) {
        return {
          available: false,
          reason: "Economic Calendar بەردەست نییە."
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

      const events = data
        .filter(item => {
          const country =
            String(item.country || "")
              .toUpperCase();

          const event =
            String(item.event || "")
              .toUpperCase();

          const impact =
            String(
              item.impact ||
              item.importance ||
              ""
            ).toUpperCase();

          return (
            country === "US" ||
            country === "USA" ||
            keywords.some(k =>
              event.includes(k)
            ) ||
            impact.includes("HIGH") ||
            impact.includes("IMPORTANT")
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
        reason: "کێشە لە وەرگرتنی News Data."
      };
    }
  }

  const [market, news] =
    await Promise.all([
      getMarket(),
      getNews()
    ]);

  // =====================================================
  // LIVE CONTEXT
  // =====================================================

  const liveContext = {
    symbol,
    interval,

    market: market.available
      ? {
          current: market.current,
          previous: market.previous,
          direction: market.direction,
          recentCandles:
            market.candles.slice(0, 30)
        }
      : {
          unavailable: true,
          reason: market.reason
        },

    news: news.available
      ? {
          events: news.events
        }
      : {
          unavailable: true,
          reason: news.reason
        }
  };

  // =====================================================
  // SHAHANFX SYSTEM PROMPT
  // =====================================================

  const systemPrompt = `
تۆ ShahanFX AI ـیت، ڕاوێژکاری پیشەیی بۆ Forex و Gold.

ALC™ سیستەمێکی جیاوازە لە ICT و SMC.
ALC™ و ICT و SMC بە شێوەی جیاواز لە شیکردنەوە بەکاربهێنە.

━━━━━━━━━━━━━━━━━━━━━━
یاسای زمانی
━━━━━━━━━━━━━━━━━━━━━━

1. هەموو وەڵامەکەت تەنها بە کوردی سۆرانی بنووسە.

2. ئەگەر بەکارهێنەر بە English یان هەر زمانێکی تر پرسیار کرد،
   هەر وەڵامەکە بە کوردی سۆرانی بدە.

3. تەنها وشە تەکنیکییە باوەکان دەتوانن بە English بمێننەوە:

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
یاسای Live Data
━━━━━━━━━━━━━━━━━━━━━━

1. تەنها ئەو نرخ و Candle و News ـە بەکاربهێنە
   کە لە Live Context ـدا هەیە.

2. هیچ نرخێک لە خۆتەوە دروست مەکە.

3. هیچ News ـێک لە خۆتەوە دروست مەکە.

4. هیچ CPI / NFP / FOMC / GDP / Interest Rate
   ـێک لە خۆتەوە دروست مەکە.

5. ئەگەر Live Data بەردەست نییە،
   بە کوردی سۆرانی ڕوونی بکەوە.

6. بە داتای کۆن ناڵێ Live.

7. Candle و News و Structure
   لە هەمان شیکارییەکدا هەڵسەنگێنە.

━━━━━━━━━━━━━━━━━━━━━━
Market Analysis
━━━━━━━━━━━━━━━━━━━━━━

هەموو جارێک ئەمانە بپشکنە:

• Price
• Candle
• Market Structure
• HH
• HL
• LH
• LL
• Liquidity
• BSL
• SSL
• Liquidity Sweep
• BOS
• CHOCH
• FVG
• Order Block
• Premium
• Discount
• ALC™
• ICT
• SMC
• News Impact

━━━━━━━━━━━━━━━━━━━━━━
Trade Rules
━━━━━━━━━━━━━━━━━━━━━━

هیچ Trade ـێک بە دڵنیایی 100% مەدە.

ئەگەر Confirmation تەواو نییە:

WAIT

پێشنیاری BUY/SELL مەدە تەنها بۆ ئەوەی
بەکارهێنەر سیگناڵی دەوێت.

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

هەموو وەڵامەکان:
کورت، ڕوون، پیشەیی و بە کوردی سۆرانی بن.

━━━━━━━━━━━━━━━━━━━━━━
Live Context
━━━━━━━━━━━━━━━━━━━━━━

${JSON.stringify(liveContext)}
`;

  // =====================================================
  // IMAGE PARSER
  // =====================================================

  function parseDataUrl(dataUrl) {
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
            mime_type: parsed.mime,
            data: parsed.data
          }
        });
      }
    }

    for (const model of models) {
      if (Date.now() >= deadline) {
        break;
      }

      try {
        const url =
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

        const response =
          await fetchTimeout(
            url,
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
                  maxOutputTokens: 2200
                }
              })
            },
            Math.max(
              2500,
              deadline - Date.now()
            )
          );

        const data =
          await response.json();

        const answer =
          data?.candidates?.[0]?.content?.parts
            ?.map(x => x.text || "")
            .join("")
            .trim();

        if (
          response.ok &&
          answer
        ) {
          return {
            answer: clean(answer),
            provider: "Gemini",
            model
          };
        }
      } catch {}
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

            body: JSON.stringify({
              model: "openrouter/free",

              messages: [
                {
                  role: "system",
                  content:
                    systemPrompt
                },

                {
                  role: "user",
                  content:
                    message ||
                    "ئەم Chart ـە بە وردی بە کوردی سۆرانی شیکاربکە."
                }
              ],

              max_tokens: 2200
            })
          },

          Math.max(
            2500,
            deadline - Date.now()
          )
        );

      const data =
        await response.json();

      const answer =
        data?.choices?.[0]?.message?.content;

      if (
        response.ok &&
        answer
      ) {
        return {
          answer: clean(answer),
          provider: "OpenRouter",
          model:
            data?.model ||
            "openrouter/free"
        };
      }
    } catch {}

    return null;
  }

  // =====================================================
  // AI FALLBACK
  // =====================================================

  const ai =
    await callGemini() ||
    await callOpenRouter();

  if (!ai) {
    return res.status(503).json({
      ok: false,
      success: false,

      error:
        "⚠️ ShahanFX AI لە ئێستادا نەتوانی وەڵام بدات. تکایە دووبارە هەوڵ بدە.",

      liveData: {
        market:
          market.available,

        news:
          news.available
      }
    });
  }

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
        market.available,

      news:
        news.available
    },

    market:
      market.available
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
      news.available
        ? {
            count:
              news.events.length
          }
        : null
  });
}
