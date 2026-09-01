// api/chat.js
// ShahanFX AI Pro Backend
// Gemini + OpenRouter Fallback
// Kurdish Sorani + Forex + ALC™ + ICT + SMC

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      success: true,
      project: "ShahanFX AI",
      status: "online",
      message: "بەکەی Backend ـی ShahanFX AI بە سەرکەوتوویی کار دەکات."
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      success: false,
      error: "تەنها داواکاری POST ڕێگەپێدراوە."
    });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;
  const FMP_API_KEY = process.env.FMP_API_KEY;

  async function fetchWithTimeout(url, options = {}, timeout = 15000) {
    const controller = new AbortController();

    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }
  }

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

  const action =
    typeof body.action === "string"
      ? body.action.trim().toLowerCase()
      : "market";

  if (!message && !image) {
    return res.status(400).json({
      ok: false,
      success: false,
      error: "تکایە پرسیارێک بنووسە یان وێنەی Chart بنێرە."
    });
  }

  function safeString(value) {
    if (value === null || value === undefined) return "";

    if (typeof value === "string") return value;

    if (Array.isArray(value)) {
      return value
        .map(safeString)
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

  function cleanAnswer(answer) {
    let text = safeString(answer);

    text = text.replace(/User Safety:\s*safe/gi, "");
    text = text.replace(/System:\s*/gi, "");

    return text.trim();
  }

  // =========================
  // MARKET DATA
  // =========================

  async function getMarketData() {
    if (!TWELVE_DATA_API_KEY) {
      return {
        available: false,
        reason: "کلیلی TWELVE_DATA_API_KEY دانەنراوە."
      };
    }

    try {
      const url =
        "https://api.twelvedata.com/time_series" +
        `?symbol=${encodeURIComponent(symbol)}` +
        `&interval=${encodeURIComponent(interval)}` +
        "&outputsize=100" +
        `&apikey=${encodeURIComponent(TWELVE_DATA_API_KEY)}`;

      const response = await fetchWithTimeout(
        url,
        {
          method: "GET",
          headers: {
            Accept: "application/json"
          }
        },
        12000
      );

      const data = await response.json();

      if (!response.ok || data.status === "error" || !data.values) {
        console.error("Twelve Data:", data);

        return {
          available: false,
          reason: "زانیاریی بازاڕ بەردەست نییە."
        };
      }

      const candles = Array.isArray(data.values)
        ? data.values
        : [];

      if (!candles.length) {
        return {
          available: false,
          reason: "هیچ Candle ـێک نەدۆزرایەوە."
        };
      }

      const current = candles[0];
      const previous = candles[1] || null;

      const currentClose = Number(current.close);
      const previousClose = previous
        ? Number(previous.close)
        : null;

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
        direction,
        candles
      };
    } catch (error) {
      console.error("Market error:", error);

      return {
        available: false,
        reason: "هەڵەیەک ڕوویدا لە وەرگرتنی زانیاریی بازاڕ."
      };
    }
  }

  // =========================
  // NEWS DATA
  // =========================

  async function getNewsData() {
    if (!FMP_API_KEY) {
      return {
        available: false,
        reason: "کلیلی FMP_API_KEY دانەنراوە."
      };
    }

    try {
      const url =
        "https://financialmodelingprep.com/stable/economic-calendar" +
        `?apikey=${encodeURIComponent(FMP_API_KEY)}`;

      const response = await fetchWithTimeout(
        url,
        {
          method: "GET",
          headers: {
            Accept: "application/json"
          }
        },
        12000
      );

      const data = await response.json();

      if (!response.ok || !Array.isArray(data)) {
        console.error("FMP:", data);

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
            String(item.country || "").toUpperCase();

          const event =
            String(item.event || "").toUpperCase();

          const impact =
            String(
              item.impact ||
              item.importance ||
              ""
            ).toUpperCase();

          const important =
            keywords.some(k => event.includes(k));

          const highImpact =
            impact.includes("HIGH") ||
            impact.includes("IMPORTANT");

          return (
            country === "US" ||
            country === "USA" ||
            important ||
            highImpact
          );
        })
        .slice(0, 50);

      return {
        available: true,
        events
      };
    } catch (error) {
      console.error("News error:", error);

      return {
        available: false,
        reason: "هەڵەیەک ڕوویدا لە وەرگرتنی News Data."
      };
    }
  }

  const [marketData, newsData] =
    await Promise.all([
      getMarketData(),
      getNewsData()
    ]);

  // =========================
  // SYSTEM PROMPT
  // =========================

  const systemPrompt = `
تۆ ShahanFX AI ـیت، ڕاوێژکاری زیرەکی بۆ Forex، Gold، ALC™، ICT و SMC.

ALC™ سیستەمێکی جیاوازە لە ICT و SMC وەک یەکێک لە بنەماکانی شیکردنەوە مامەڵەی لەگەڵ بکە.

یاساکان:

1. هەموو وەڵامەکان بە کوردی سۆرانی بنووسە.
2. وشە تەکنیکییە باوەکان وەک Forex، Gold، Buy، Sell، Entry، Stop Loss، Take Profit، Liquidity، FVG، BOS، CHOCH، ICT، SMC و ALC™ دەتوانن بە English بمێننەوە.
3. هیچ نرخ، News، CPI، NFP، FOMC یان Data ـێک لە خۆتەوە دروست مەکە.
4. تەنها ئەو Live Data ـە بەکاربهێنە کە لە Context ـدا دراوە.
5. ئەگەر Live Data بەردەست نەبوو، بە ڕوونی بڵێ.
6. هیچ قازانجێکی دڵنیایی یان Trade ـی 100% مەبەخشە.
7. ئەگەر Confirmation تەواو نییە، WAIT پێشنیار بکە.
8. ئەگەر News ـی گرنگ نزیکە، ئاگاداری بکە.
9. Risk Management گرنگە.
10. ئەگەر Chart Image هەیە، شیکردنەوەی Chart بکە.
11. ئەگەر Image ـەکە ناتوانرێت بخوێندرێتەوە، ڕوونی بکەوە.
12. هیچ زانیارییەکی ساختە دروست مەکە.
13. وەڵامەکان کورت، ڕوون و پیشەیی بن.
14. بە زمانی کوردی سۆرانی و ڕێنووسی ئاسان و سروشتی وەڵام بدە.

بۆ Trade Setup، تەنها کاتێک Confirmation هەیە:

📊 Symbol:
📈 Bias:
🎯 Entry:
🛑 Stop Loss:
💰 Take Profit:
⚖️ Risk/Reward:
🔎 Confirmation:
📰 News:
⏳ Decision:

ئەگەر Setup تەواو نییە:

⏳ WAIT

هۆکاری WAIT بە کوردی سۆرانی ڕوون بکەوە.

ئامانج:
شیکردنەوەی ورد و پارێزراو، نەک دڵنیایی ساختە.
`;

  // =========================
  // LIVE CONTEXT
  // =========================

  let liveContext = `
━━━ SHAHANFX LIVE CONTEXT ━━━

Symbol:
${symbol}

Timeframe:
${interval}

Action:
${action}

User Message:
${message || "تەنها Chart Image نێردراوە."}
`;

  if (marketData.available) {
    const current = marketData.current || {};
    const previous = marketData.previous || {};

    liveContext += `

━━━ LIVE MARKET DATA ━━━

Symbol: ${marketData.symbol}
Interval: ${marketData.interval}

Current Candle:
Time: ${safeString(current.datetime)}
Open: ${safeString(current.open)}
High: ${safeString(current.high)}
Low: ${safeString(current.low)}
Close: ${safeString(current.close)}

Previous Candle:
Time: ${safeString(previous.datetime)}
Open: ${safeString(previous.open)}
High: ${safeString(previous.high)}
Low: ${safeString(previous.low)}
Close: ${safeString(previous.close)}

Direction:
${marketData.direction}
`;
  } else {
    liveContext += `

━━━ MARKET DATA ━━━

Market Data بەردەست نییە.

Reason:
${marketData.reason}

هیچ نرخێکی ساختە مەدروستکە.
`;
  }

  if (newsData.available) {
    liveContext += `

━━━ ECONOMIC NEWS ━━━
`;

    if (!newsData.events.length) {
      liveContext +=
        "\nهیچ ڕووداوێکی گرنگ نەدۆزرایەوە.\n";
    } else {
      liveContext += newsData.events
        .map((item, index) => {
          return `
${index + 1}.
Date: ${safeString(item.date || item.datetime)}
Country: ${safeString(item.country)}
Event: ${safeString(item.event)}
Impact: ${safeString(
            item.impact || item.importance
          )}
Previous: ${safeString(item.previous)}
Estimate: ${safeString(item.estimate)}
Actual: ${safeString(item.actual)}
`;
        })
        .join("\n");
    }
  } else {
    liveContext += `

━━━ NEWS DATA ━━━

News Data بەردەست نییە.

Reason:
${newsData.reason}
`;
  }

  if (
    marketData.available &&
    marketData.candles?.length
  ) {
    liveContext += `

━━━ RECENT CANDLES ━━━

`;

    liveContext += marketData.candles
      .slice(0, 50)
      .map((candle, index) => {
        return `${index + 1}. ${safeString(
          candle.datetime
        )} | O:${safeString(
          candle.open
        )} H:${safeString(
          candle.high
        )} L:${safeString(
          candle.low
        )} C:${safeString(candle.close)}`;
      })
      .join("\n");
  }

  // =========================
  // IMAGE
  // =========================

  let imagePart = null;

  if (image) {
    try {
      const match = image.match(
        /^data:([^;]+);base64,(.+)$/
      );

      if (match) {
        imagePart = {
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        };
      }
    } catch (error) {
      console.error("Image parsing:", error);
    }
  }

  // =========================
  // GEMINI
  // =========================

  async function callGemini() {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing");
    }

    const models = [
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash"
    ];

    let lastError = null;

    for (const model of models) {
      try {
        const url =
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
          `?key=${encodeURIComponent(GEMINI_API_KEY)}`;

        const parts = [
          {
            text:
              systemPrompt +
              "\n\n" +
              liveContext
          }
        ];

        if (imagePart) {
          parts.push(imagePart);
        }

        const response =
          await fetchWithTimeout(
            url,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
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
            },
            30000
          );

        const data = await response.json();

        if (!response.ok) {
          console.error(
            `Gemini ${model}:`,
            response.status,
            data
          );

          lastError = new Error(
            `Gemini ${model} failed`
          );

          continue;
        }

        const text =
          data?.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("")
            .trim();

        if (!text) {
          lastError = new Error(
            `Gemini ${model} empty response`
          );

          continue;
        }

        return {
          answer: cleanAnswer(text),
          provider: "Gemini",
          model
        };
      } catch (error) {
        console.error(
          `Gemini ${model} error:`,
          error
        );

        lastError = error;
      }
    }

    throw (
      lastError ||
      new Error("Gemini failed")
    );
  }

  // =========================
  // OPENROUTER
  // =========================

  async function callOpenRouter() {
    if (!OPENROUTER_API_KEY) {
      throw new Error(
        "OPENROUTER_API_KEY is missing"
      );
    }

    const userContent = [
      {
        type: "text",
        text: liveContext
      }
    ];

    if (image) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: image
        }
      });
    }

    const response =
      await fetchWithTimeout(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type":
              "application/json",
            "HTTP-Referer":
              "https://shahanfx.com",
            "X-Title":
              "ShahanFX AI"
          },
          body: JSON.stringify({
            model: "openrouter/free",
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: userContent
              }
            ],
            max_tokens: 5000
          })
        },
        30000
      );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "OpenRouter:",
        response.status,
        data
      );

      throw new Error(
        `OpenRouter failed: ${response.status}`
      );
    }

    const content =
      data?.choices?.[0]?.message?.content;

    const text =
      cleanAnswer(content);

    if (!text) {
      throw new Error(
        "OpenRouter empty response"
      );
    }

    return {
      answer: text,
      provider: "OpenRouter",
      model:
        data?.model ||
        "openrouter/free"
    };
  }

  // =========================
  // AI FALLBACK
  // =========================

  let aiResult = null;

  let geminiStatus = "not attempted";
  let openRouterStatus = "not attempted";

  if (GEMINI_API_KEY) {
    try {
      aiResult = await callGemini();
      geminiStatus = "success";
    } catch (error) {
      geminiStatus = "failed";

      console.error(
        "All Gemini models failed:",
        error
      );
    }
  } else {
    geminiStatus = "missing API key";
  }

  if (!aiResult && OPENROUTER_API_KEY) {
    try {
      aiResult = await callOpenRouter();
      openRouterStatus = "success";
    } catch (error) {
      openRouterStatus = "failed";

      console.error(
        "OpenRouter failed:",
        error
      );
    }
  } else if (!OPENROUTER_API_KEY) {
    openRouterStatus = "missing API key";
  }

  // =========================
  // FAILURE
  // =========================

  if (!aiResult) {
    console.error(
      "ShahanFX AI failed:",
      {
        geminiStatus,
        openRouterStatus
      }
    );

    return res.status(503).json({
      ok: false,
      success: false,
      error:
        "⚠️ هیچ یەکێک لە خزمەتگوزارییەکانی ShahanFX AI وەڵامی نەدا. تکایە دواتر دووبارە هەوڵ بدە.",
      gemini: geminiStatus,
      openrouter: openRouterStatus
    });
  }

  // =========================
  // SUCCESS
  // =========================

  return res.status(200).json({
    ok: true,
    success: true,

    answer: aiResult.answer,

    provider: aiResult.provider,

    model: aiResult.model,

    hasImage: Boolean(image),

    liveData: {
      market: marketData.available,
      news: newsData.available
    },

    market: marketData.available
      ? {
          symbol: marketData.symbol,
          interval: marketData.interval,
          direction: marketData.direction,
          current: marketData.current
        }
      : null,

    news: newsData.available
      ? {
          count: newsData.events.length
        }
      : null
  });
}
