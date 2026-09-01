// api/chat.js

const ALLOWED_ORIGINS = ["*"];

const SYSTEM_PROMPT = `
تۆ "ShahanFX AI" ـیت، ڕاوێژکاری زیرەک بۆ Forex، ALC™، ICT و SMC.

========================
🗣️ زمانی وەڵام
========================

- تەنها بە کوردی سۆرانی وەڵام بدە.
- وەڵامەکانت سروشتی، ڕوون و ئاسان بۆ خوێندنەوە بن.
- عەرەبی فەصیح، فارسی، تورکی یان زمانی تر بەکارمەهێنە.
- وشە تەکنیکییە باوەکان وەک Forex، ALC™، ICT، SMC، XAUUSD، FVG،
  Liquidity، BOS، CHOCH، Entry، Stop Loss، Take Profit، Risk/Reward
  دەتوانیت بە ئینگلیزی بهێڵیت.
- هیچ وشەی بێمانا یان وشەی تێکەڵکراوی نادیار دروست مەکە.
- ڕستەکان کورت و ڕوون بن.
- لە وشەی عەرەبی و فارسی کە هاوشێوەی کوردی نییە دووربە.
- هەرکات وشەی تەکنیکی بەکاردەهێنیت، ئەگەر پێویست بوو بە سۆرانی ڕوونی بکەوە.

========================
📚 زانستی سەرەکی
========================

ALC™، ICT و SMC سێ بوار/سیستەمی جیاوازن.

لە شیکردنەوەکاندا دەتوانیت ئەمانە بەکاربهێنیت:

• Market Structure
• Trend
• Liquidity
• Liquidity Sweep
• FVG
• BOS
• CHOCH
• Order Block
• Breaker
• Mitigation
• Premium / Discount
• Support / Resistance
• Session
• London Session
• New York Session
• Risk Management

========================
📊 شیکردنەوەی XAUUSD
========================

کاتێک بەکارهێنەر دەڵێت XAUUSD شیکاربکە:

1. نرخی ئێستا بخوێنەوە.
2. ئاراستەی گشتی بازاڕ دیاری بکە.
3. Market Structure شیکاربکە.
4. Liquidity ـەکان بپشکنە.
5. Liquidity Sweep بگەڕێ.
6. FVG بپشکنە.
7. BOS / CHOCH بپشکنە.
8. Entry ـی گونجاو دیاری بکە.
9. Stop Loss دیاری بکە.
10. Take Profit دیاری بکە.
11. Risk/Reward هەژمار بکە.
12. News ـی گرنگ لەبەرچاو بگرە.
13. لە کۆتاییدا یەکێک لەم بڕیارانە بدە:
   BUY
   SELL
   WAIT

========================
⏳ کاتی WAIT
========================

ئەگەر شیکردنەوەکە پشتگیرییەکی بەهێزی نییە:

"⏳ Decision: WAIT"

بەکاربهێنە.

WAIT واتە چاوەڕێکردن بۆ پشتڕاستکردنەوە، نەک ئەوەی بازاڕ حەتمەن دەتوانێت بەرەو دژی بڕوات.

========================
⚠️ یاسای گرنگ
========================

- هیچکات قازانجی 100% مەبەخشە.
- هیچکات بڵێ "ئەم Trade ـە حەتمەن قازانج دەکات".
- ئەگەر داتا کەمە، بە ڕوونی بڵێ داتا بەس نییە.
- ئەگەر News بەردەست نییە، مەهێنە بە شێوەی خۆت.
- نرخ و داتا دروست مەکە.
- ئەگەر Live Data بەردەست بوو، تەنها لەسەر ئەو داتایە شیکردنەوە بکە.
- Risk Management گرنگە.
- Stop Loss بەبێ پشتگیریی Structure پێشنیار مەکە.

========================
📝 شێوازی وەڵام
========================

وەڵامەکانت بە Markdown ـی سادە بن.

نمونە:

📊 XAUUSD – 5 خولەک

🔹 نرخی ئێستا: 4332.73
🔹 ئاراستە: Neutral

🏗️ Structure:
بازاڕ لە ناوچەی چاوەڕوانیدایە و BOS ـی بەهێز نییە.

💧 Liquidity:
چاوەڕێی Liquidity Sweep بکە.

🟨 FVG:
ئەگەر FVG ـی گونجاو هەبێت، ناوچەکە دیاری بکە.

🔥 BOS / CHOCH:
پشتڕاستکردنەوەی BOS یان CHOCH پێویستە.

📌 Entry:
تا پشتڕاستکردنەوەی تەواو نییە، Entry مەکە.

🛑 Stop Loss:
دوای دیاریکردنی Entry و Structure ـی دروست دیاری دەکرێت.

🎯 Take Profit:
لەسەر Liquidity یان Target ـی Structure دیاری دەکرێت.

⚖️ Risk/Reward:
پێشنیاری Trade تەنها کاتێک بکە کە Risk/Reward گونجاو بێت.

📰 News:
ئەگەر News Data بەردەست بوو، گرنگترین هەواڵەکان بخەڕوو.

⏳ Decision: WAIT

⚠️ ئەمە شیکردنەوەی بازاڕە، نەک دڵنیایی لە ئەنجامی Trade.

========================
🎯 ئامانج
========================

تۆ دەبێت وەک ShahanFX AI وەڵام بدەیت:
کوردی سۆرانی + زانستی + ڕوون + کورت + بێ وشەی بێمانا.
`;

function jsonResponse(data, status = 200, origin = "*") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Cache-Control": "no-store"
    }
  });
}

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

async function getTwelveData(symbol = "XAU/USD", interval = "5min") {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return {
      available: false,
      source: "Twelve Data",
      error: "TWELVE_DATA_API_KEY is not configured"
    };
  }

  try {
    const url =
      `https://api.twelvedata.com/time_series` +
      `?symbol=${encodeURIComponent(symbol)}` +
      `&interval=${encodeURIComponent(interval)}` +
      `&outputsize=30` +
      `&apikey=${encodeURIComponent(apiKey)}`;

    const response = await fetchWithTimeout(url, {}, 12000);

    const data = await response.json();

    if (!response.ok || data.status === "error" || !data.values) {
      return {
        available: false,
        source: "Twelve Data",
        error: data.message || "Market data unavailable"
      };
    }

    const values = data.values;

    const latest = values[0];

    return {
      available: true,
      source: "Twelve Data",
      symbol,
      interval,
      latest: {
        datetime: latest.datetime,
        open: Number(latest.open),
        high: Number(latest.high),
        low: Number(latest.low),
        close: Number(latest.close)
      },
      candles: values.slice(0, 20).map(c => ({
        datetime: c.datetime,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close)
      }))
    };
  } catch (error) {
    return {
      available: false,
      source: "Twelve Data",
      error: error.name === "AbortError"
        ? "Market data request timed out"
        : error.message
    };
  }
}

async function getFMPNews() {
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    return {
      available: false,
      source: "FMP",
      error: "FMP_API_KEY is not configured"
    };
  }

  try {
    const url =
      `https://financialmodelingprep.com/api/v3/stock_news` +
      `?tickers=XAUUSD` +
      `&limit=10` +
      `&apikey=${encodeURIComponent(apiKey)}`;

    const response = await fetchWithTimeout(url, {}, 12000);

    const data = await response.json();

    if (!response.ok || !Array.isArray(data)) {
      return {
        available: false,
        source: "FMP",
        error: "News unavailable"
      };
    }

    return {
      available: true,
      source: "FMP",
      news: data.slice(0, 10).map(item => ({
        title: item.title || "",
        text: item.text || "",
        publishedDate: item.publishedDate || "",
        site: item.site || ""
      }))
    };
  } catch (error) {
    return {
      available: false,
      source: "FMP",
      error: error.name === "AbortError"
        ? "News request timed out"
        : error.message
    };
  }
}

function buildMarketText(market) {
  if (!market || !market.available) {
    return `
Live Market Data:
بەردەست نییە.
`;
  }

  const l = market.latest;

  return `
Live Market Data:
Symbol: ${market.symbol}
Timeframe: ${market.interval}
Time: ${l.datetime}
Open: ${l.open}
High: ${l.high}
Low: ${l.low}
Close: ${l.close}

Recent Candles:
${market.candles.map((c, i) =>
  `${i + 1}. ${c.datetime} | O:${c.open} H:${c.high} L:${c.low} C:${c.close}`
).join("\n")}
`;
}

function buildNewsText(news) {
  if (!news || !news.available || !news.news?.length) {
    return `
News Data:
بەردەست نییە.
هیچ هەواڵێکی پشتڕاستکراو بەردەست نییە.
`;
  }

  return `
News Data:
${news.news.map((n, i) => `
${i + 1}. ${n.title}
${n.text}
${n.publishedDate}
`).join("\n")}
`;
}

async function callGemini({
  apiKey,
  model,
  userText,
  imageBase64,
  imageMimeType,
  market,
  news
}) {
  const parts = [];

  const context = `
${SYSTEM_PROMPT}

========================
LIVE DATA
========================

${buildMarketText(market)}

${buildNewsText(news)}

========================
USER REQUEST
========================

${userText || "تکایە ئەم داتایە شیکاربکە."}
`;

  parts.push({
    text: context
  });

  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: imageMimeType || "image/jpeg",
        data: imageBase64
      }
    });
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [
      {
        role: "user",
        parts
      }
    ]
  };

  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    },
    30000
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
      `Gemini HTTP ${response.status}`
    );
  }

  const answer =
    data?.candidates?.[0]?.content?.parts
      ?.map(p => p.text || "")
      .join("")
      .trim();

  if (!answer) {
    throw new Error("Gemini returned an empty answer");
  }

  return {
    answer,
    provider: "Gemini",
    model
  };
}

async function callOpenRouter({
  apiKey,
  userText,
  imageBase64,
  imageMimeType,
  market,
  news
}) {
  const messages = [
    {
      role: "system",
      content: SYSTEM_PROMPT
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `
${buildMarketText(market)}

${buildNewsText(news)}

پرسیاری بەکارهێنەر:
${userText || "تکایە ئەم داتایە شیکاربکە."}
`
        }
      ]
    }
  ];

  if (imageBase64) {
    messages[1].content.push({
      type: "image_url",
      image_url: {
        url: `data:${imageMimeType || "image/jpeg"};base64,${imageBase64}`
      }
    });
  }

  const response = await fetchWithTimeout(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://shahanfx-backend-9576.vercel.app/",
        "X-Title": "ShahanFX AI"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages
      })
    },
    30000
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
      `OpenRouter HTTP ${response.status}`
    );
  }

  const answer =
    data?.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    throw new Error("OpenRouter returned an empty answer");
  }

  return {
    answer,
    provider: "OpenRouter",
    model: data?.model || "openrouter/free"
  };
}

export default async function handler(req) {
  const origin = req.headers.get("origin") || "*";

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }

  if (req.method === "GET") {
    return jsonResponse({
      ok: true,
      project: "ShahanFX AI",
      status: "online",
      message: "ShahanFX Backend is working!"
    }, 200, origin);
  }

  if (req.method !== "POST") {
    return jsonResponse({
      ok: false,
      error: "Method not allowed"
    }, 405, origin);
  }

  try {
    const body = await req.json();

    const userText =
      typeof body?.message === "string"
        ? body.message.trim()
        : "";

    let imageBase64 = null;
    let imageMimeType = "image/jpeg";

    if (body?.image) {
      if (typeof body.image === "string") {
        imageBase64 = body.image
          .replace(/^data:image\/[^;]+;base64,/, "")
          .trim();
      }

      if (body?.imageMimeType) {
        imageMimeType = body.imageMimeType;
      }
    }

    const symbol = body?.symbol || "XAU/USD";
    const interval = body?.interval || "5min";

    const [market, news] = await Promise.all([
      getTwelveData(symbol, interval),
      getFMPNews()
    ]);

    const errors = [];

    // ========================
    // Gemini
    // ========================

    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      const geminiModels = [
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-3.5-flash"
      ];

      for (const model of geminiModels) {
        try {
          const result = await callGemini({
            apiKey: geminiKey,
            model,
            userText,
            imageBase64,
            imageMimeType,
            market,
            news
          });

          return jsonResponse({
            ok: true,
            answer: result.answer,
            provider: result.provider,
            model: result.model,
            liveData: {
              market,
              news
            }
          }, 200, origin);

        } catch (error) {
          errors.push(`Gemini ${model}: ${error.message}`);
        }
      }
    } else {
      errors.push("GEMINI_API_KEY is not configured");
    }

    // ========================
    // OpenRouter fallback
    // ========================

    const openRouterKey = process.env.OPENROUTER_API_KEY;

    if (openRouterKey) {
      try {
        const result = await callOpenRouter({
          apiKey: openRouterKey,
          userText,
          imageBase64,
          imageMimeType,
          market,
          news
        });

        return jsonResponse({
          ok: true,
          answer: result.answer,
          provider: result.provider,
          model: result.model,
          liveData: {
            market,
            news
          }
        }, 200, origin);

      } catch (error) {
        errors.push(`OpenRouter: ${error.message}`);
      }
    } else {
      errors.push("OPENROUTER_API_KEY is not configured");
    }

    return jsonResponse({
      ok: false,
      error: "هیچ AI Provider ـێک نەیتوانی وەڵام بدات.",
      details: errors,
      liveData: {
        market,
        news
      }
    }, 503, origin);

  } catch (error) {
    return jsonResponse({
      ok: false,
      error: "هەڵەیەک لە Backend ڕوویدا.",
      details: error.message
    }, 500, origin);
  }
}
