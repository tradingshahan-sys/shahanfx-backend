// api/chat.js
// ============================================================
// ShahanFX AI Pro Backend
// Live Market + Economic News + Chart Image + SMC Analyzer
// 4x Gemini Key Failover + OpenRouter
//
// Timezone:
// Asia/Baghdad
// Clock:
// 12-hour AM / PM
//
// AI Config:
// ../config/ai-config.js
// SMC Analyzer:
// ../utils/smcAnalyzer.js
// RETRY ORDER:
// 0 → 1 → 2 → 3 → 4 → 0 → 1 → 2 → 3 → 4
//
// 0 = GEMINI_API_KEY
// 1 = GEMINI_API_KEY1
// 2 = GEMINI_API_KEY2
// 3 = GEMINI_API_KEY3
// 4 = OPENROUTER_API_KEY
// ============================================================

import AI_CONFIG from "../config/ai-config.js";
import analyzeSMC from "../utils/smcAnalyzer.js";

export default async function handler(req, res) {

  // ==========================================================
  // CORS
  // ==========================================================

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  // ==========================================================
  // OPTIONS
  // ==========================================================

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // ==========================================================
  // TIMEZONE HELPERS
  // ==========================================================

  function getIraqDateTime(dateValue = new Date()) {

    try {

      const parts =
        new Intl.DateTimeFormat(
          "en-US",
          {
            timeZone: "Asia/Baghdad",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
          }
        ).formatToParts(dateValue);

      const get = (type) =>
        parts.find(
          (part) => part.type === type
        )?.value || "";

      return {

        date:
          `${get("year")}-${get("month")}-${get("day")}`,

        time:
          `${get("hour")}:${get("minute")}:${get("second")} ${get("dayPeriod")}`,

        formatted:
          `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")} ${get("dayPeriod")}`,

        timezone:
          "Asia/Baghdad",

        timezoneLabel:
          "کاتی عێراق",

        clock:
          "12-hour"

      };

    } catch {

      return {

        date: null,
        time: null,
        formatted: null,
        timezone: "Asia/Baghdad",
        timezoneLabel: "کاتی عێراق",
        clock: "12-hour"

      };
    }
  }

  // ==========================================================
  // FORMAT DATE → IRAQ TIME / 12-HOUR
  // ==========================================================

  function formatIraqTime(dateValue) {

    if (!dateValue) {
      return null;
    }

    try {

      let value =
        String(dateValue).trim();

      if (
        !/[zZ]$/.test(value) &&
        !/[+-]\d{2}:\d{2}$/.test(value)
      ) {

        value =
          value.replace(
            " ",
            "T"
          ) + "Z";
      }

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {

        return dateValue;
      }

      const parts =
        new Intl.DateTimeFormat(
          "en-US",
          {
            timeZone: "Asia/Baghdad",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
          }
        ).formatToParts(date);

      const get = (type) =>
        parts.find(
          (part) => part.type === type
        )?.value || "";

      return (
        `${get("year")}-${get("month")}-${get("day")} ` +
        `${get("hour")}:${get("minute")}:${get("second")} ` +
        `${get("dayPeriod")}`
      );

    } catch {

      return dateValue;

    }
  }

  // ==========================================================
  // HEALTH CHECK
  // ==========================================================

  if (req.method === "GET") {

    const iraqTime =
      getIraqDateTime();

    return res.status(200).json({

      ok: true,

      success: true,

      project:
        "ShahanFX AI Pro",

      status:
        "online",

      live:
        true,

      version:
        "6.1",

      aiConfig:
        true,

      timezone:
        "Asia/Baghdad",

      timezoneLabel:
        "کاتی عێراق",

      clock:
        "12-hour",

      currentIraqTime:
        iraqTime,

      message:
        "ShahanFX Backend is working!"

    });
  }

  // ==========================================================
  // METHOD CHECK
  // ==========================================================

  if (req.method !== "POST") {

    return res.status(405).json({

      ok: false,

      error:
        "تەنها POST ڕێگەپێدراوە."

    });
  }

  // ==========================================================
  // ENVIRONMENT VARIABLES
  // ==========================================================

  const GEMINI_KEYS = [

    process.env.GEMINI_API_KEY,

    process.env.GEMINI_API_KEY1,

    process.env.GEMINI_API_KEY2,

    process.env.GEMINI_API_KEY3

  ];

  const OPENROUTER_API_KEY =
    process.env.OPENROUTER_API_KEY || "";

  const TWELVE_DATA_API_KEY =
    process.env.TWELVE_DATA_API_KEY || "";

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

      error:
        "داتای نێردراو دروست نییە."

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
  // RETRY SETTINGS
  // ==========================================================

  const ATTEMPT_TIMEOUT =
    8000;

  const MAX_ATTEMPTS =
    10;

  // ==========================================================
  // FETCH WITH TIMEOUT
  // ==========================================================

  async function fetchTimeout(
    url,
    options = {},
    timeout = ATTEMPT_TIMEOUT
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

  // ==========================================================
  // CLEAN AI TEXT
  // ==========================================================

  function clean(text) {

    if (!text) {
      return "";
    }

    let result =
      String(text);

    result =
      result

        .replace(
          /User Safety:\s*safe/gi,
          ""
        )

        .replace(
          /^System:\s*/gim,
          ""
        )

        .replace(
          /^Assistant:\s*/gim,
          ""
        )

        .replace(
          /\bBUY\b/gi,
          "کڕین"
        )

        .replace(
          /\bSELL\b/gi,
          "فرۆشتن"
        )

        .replace(
          /\bWAIT\b/gi,
          "چاوەڕوان بە"
        )

        .replace(
          /\bBULLISH\b/gi,
          "بەرەو سەرەوە"
        )

        .replace(
          /\bBEARISH\b/gi,
          "بەرەو خوارەوە"
        )

        .replace(
          /\bNEUTRAL\b/gi,
          "بێ‌لایەن"
        )

        .trim();

    return result;
  }

  // ==========================================================
  // LIVE MARKET DATA
  // ==========================================================

  async function getMarket() {

    if (!TWELVE_DATA_API_KEY) {

      return {

        available: false,

        reason:
          "TWELVE_DATA_API_KEY نەدۆزرایەوە.",

        candles: [],
        fvgs: [],
        orderBlocks: [],
        smc: null

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

      let data = null;

      try {

        data =
          await response.json();

      } catch {

        data = null;

      }

      if (!response.ok) {

        return {

          available: false,

          reason:
            `Market API HTTP ${response.status}`,

          candles: [],
          fvgs: [],
          orderBlocks: [],
          smc: null

        };
      }

      if (
        !data ||
        !Array.isArray(
          data.values
        )
      ) {

        return {

          available: false,

          reason:
            data?.message ||
            "داتای بازاڕ بەردەست نییە.",

          candles: [],
          fvgs: [],
          orderBlocks: [],
          smc: null

        };
      }

      if (
        data.values.length === 0
      ) {

        return {

          available: false,

          reason:
            "هیچ کاندڵێک نەدۆزرایەوە.",

          candles: [],
          fvgs: [],
          orderBlocks: [],
          smc: null

        };
      }

      // ========================================================
      // IMPORTANT:
      // TwelveData normally returns newest candle first.
      // SMC Analyzer needs chronological order:
      // oldest → newest
      // ========================================================

      const candles =
        [...data.values].reverse();

      // ========================================================
      // CURRENT / PREVIOUS
      // Keep TwelveData newest-first logic for current price.
      // ========================================================

      const current =
        data.values[0];

      const previous =
        data.values[1] ||
        data.values[0];

      const currentClose =
        Number(
          current.close
        );

      const previousClose =
        Number(
          previous.close
        );

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

      // ========================================================
      // NORMALIZE ALL 120 CANDLES FOR SMC ENGINE
      // ========================================================

      const smcCandles =
        candles.map((c) => ({

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

      // ========================================================
      // RECENT 30 CANDLES FOR RESPONSE
      // Newest 30, same general format as before.
      // ========================================================

      const recentCandles =
        [...data.values]
          .slice(0, 30)
          .map((c) => ({

            datetime:
              formatIraqTime(
                c.datetime
              ),

            datetimeRaw:
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

      // ========================================================
      // SMC ANALYZER
      //
      // Includes:
      // FVG
      // Order Block
      // Liquidity
      // Liquidity Sweep
      // Market Structure
      // BOS
      // CHOCH
      // Displacement
      // Premium / Discount
      // Score / Setup
      // ========================================================

      let smc = null;

      try {

        smc =
          analyzeSMC(
            smcCandles
          );

      } catch (error) {

        smc = {

          available: false,

          error:
            error?.message ||
            "SMC Analyzer error"

        };
      }

      // ========================================================
      // SMC-DERIVED FVG / OB
      // ========================================================

      const fvgs =
        Array.isArray(
          smc?.fvgs
        )
          ? smc.fvgs
          : Array.isArray(
              smc?.activeFVGs
            )
              ? smc.activeFVGs
              : [];

      const orderBlocks =
        Array.isArray(
          smc?.orderBlocks
        )
          ? smc.orderBlocks
          : Array.isArray(
              smc?.activeOBs
            )
              ? smc.activeOBs
              : [];

      // ========================================================
      // SMC BIAS
      // Use analyzer bias when available.
      // Otherwise preserve old candle direction.
      // ========================================================

      const smcBias =
        smc?.summary?.bias ||
        smc?.setup?.direction ||
        null;

      const finalDirection =
        typeof smcBias === "string" &&
        smcBias.trim()
          ? smcBias
          : direction;

      return {

        available: true,

        symbol,

        interval,

        timezone:
          "Asia/Baghdad",

        timezoneLabel:
          "کاتی عێراق",

        clock:
          "12-hour",

        current: {

          datetime:
            formatIraqTime(
              current.datetime
            ),

          datetimeRaw:
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
            formatIraqTime(
              previous.datetime
            ),

          datetimeRaw:
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

        direction:
          finalDirection,

        // ======================================================
        // SMC DATA
        // ======================================================

        smc,

        marketStructure:
          smc?.marketStructure ||
          null,

        bos:
          smc?.bos ||
          [],

        choch:
          smc?.choch ||
          [],

        displacement:
          smc?.displacement ||
          [],

        liquidity:
          smc?.liquidity ||
          [],

        liquiditySweeps:
          smc?.liquiditySweeps ||
          [],

        premiumDiscount:
          smc?.premiumDiscount ||
          null,

        setup:
          smc?.setup ||
          null,

        summary:
          smc?.summary ||
          null,

        // ======================================================
        // FVG + ORDER BLOCK FROM SMC ENGINE
        // ======================================================

        fvgs,

        orderBlocks,

        // ======================================================
        // RECENT CANDLES
        // ======================================================

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

        candles: [],
        fvgs: [],
        orderBlocks: [],
        smc: null

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
        ).padStart(
          2,
          "0"
        );

      const day =
        String(
          now.getUTCDate()
        ).padStart(
          2,
          "0"
        );

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
        ).padStart(
          2,
          "0"
        );

      const futureDay =
        String(
          futureDate.getUTCDate()
        ).padStart(
          2,
          "0"
        );

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

      let data = null;

      try {

        data =
          await response.json();

      } catch {

        data = null;

      }

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

          .map((item) => {

            const rawDate =
              item.scheduledAt ||
              item.datetime ||
              item.date ||
              null;

            return {

              date:
                formatIraqTime(
                  rawDate
                ),

              dateRaw:
                rawDate,

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

            };
          })

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

          .slice(
            0,
            50
          );

      return {

        available: true,

        date:
          today,

        from:
          today,

        to,

        source:
          "Xoomar",

        provider:
          "Xoomar Pulse",

        timezone:
          "Asia/Baghdad",

        timezoneLabel:
          "کاتی عێراق",

        clock:
          "12-hour",

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
  // GET LIVE DATA
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

          candles: [],
          fvgs: [],
          orderBlocks: [],
          smc: null

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

  // ==========================================================
  // CURRENT IRAQ TIME
  // ==========================================================

  const iraqTime =
    getIraqDateTime();

  // ==========================================================
  // BUILD AI CONFIG
  // ==========================================================

  const systemPrompt =
    AI_CONFIG.buildPrompt();

  // ==========================================================
  // LIVE CONTEXT
  // ==========================================================

  const liveContext = {

    generatedAt:
      iraqTime.formatted,

    generatedAtISO:
      new Date().toISOString(),

    timezone:
      "Asia/Baghdad",

    timezoneLabel:
      "کاتی عێراق",

    clock:
      "12-hour",

    currentIraqTime:
      iraqTime,

    symbol,

    interval,

    market,

    news,

    dataPolicy: {

      liveDataOnly:
        true,

      doNotInventPrice:
        true,

      doNotInventNews:
        true,

      doNotInventTechnicalLevels:
        true,

      doNotInventFVG:
        true,

      doNotInventOrderBlock:
        true,

      doNotInventLiquidity:
        true,

      doNotInventBOS:
        true,

      doNotInventCHOCH:
        true,

      doNotInventALC:
        true,

      doNotClaimCertainty:
        true

    }

  };

  // ==========================================================
  // GEMINI MODELS
  // ==========================================================

  const GEMINI_MODELS = [

    "gemini-2.5-flash",

    "gemini-2.5-flash-lite"

  ];

  // ==========================================================
  // BUILD GEMINI PARTS
  // ==========================================================

  function buildGeminiParts() {

    const parts = [];

    parts.push({

      text:
        "Live Context:\n\n" +
        JSON.stringify(
          liveContext,
          null,
          2
        )

    });

    parts.push({

      text:
        "\n\nUser Message:\n" +
        (
          message ||
          "ئەم Chart ـە بە وردی شیکاربکە."
        )

    });

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
  // GEMINI SINGLE ATTEMPT
  // ==========================================================

  async function callGeminiOnce(
    apiKey,
    model,
    keyIndex
  ) {

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

            method:
              "POST",

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

                    parts:
                      buildGeminiParts()

                  }

                ],

                generationConfig: {

                  maxOutputTokens:
                    2200,

                  temperature:
                    0.2

                }

              })

          },

          ATTEMPT_TIMEOUT

        );

      let data = null;

      try {

        data =
          await response.json();

      } catch {

        data = null;

      }

      if (!response.ok) {
        return null;
      }

      const text =
        data
          ?.candidates?.[0]
          ?.content?.parts
          ?.map(
            (part) =>
              part.text || ""
          )
          .join("")
          .trim();

      if (!text) {
        return null;
      }

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

    } catch {

      return null;

    }
  }

  // ==========================================================
  // OPENROUTER SINGLE ATTEMPT
  // ==========================================================

  async function callOpenRouterOnce() {

    if (!OPENROUTER_API_KEY) {
      return null;
    }

    try {

      const userContent = [

        "Live Context:",

        JSON.stringify(
          liveContext,
          null,
          2
        ),

        "",

        "User Message:",

        (
          message ||
          "ئەم Chart ـە بە وردی شیکاربکە."
        )

      ].join("\n");

      const response =
        await fetchTimeout(

          "https://openrouter.ai/api/v1/chat/completions",

          {

            method:
              "POST",

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
                      userContent

                  }

                ],

                max_tokens:
                  2200,

                temperature:
                  0.2

              })

          },

          ATTEMPT_TIMEOUT

        );

      let data = null;

      try {

        data =
          await response.json();

      } catch {

        data = null;

      }

      if (!response.ok) {
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
  // FAILOVER SEQUENCE
  // ==========================================================

  async function runFailover() {

    const sequence = [

      0,
      1,
      2,
      3,
      4,

      0,
      1,
      2,
      3,
      4

    ];

    for (
      let attempt = 0;
      attempt < MAX_ATTEMPTS;
      attempt++
    ) {

      const providerIndex =
        sequence[attempt];

      if (
        providerIndex >= 0 &&
        providerIndex <= 3
      ) {

        const apiKey =
          GEMINI_KEYS[
            providerIndex
          ];

        if (
          typeof apiKey ===
            "string" &&
          apiKey.trim()
        ) {

          const result =
            await callGeminiOnce(

              apiKey,

              GEMINI_MODELS[0],

              providerIndex

            );

          if (result) {

            return {

              ...result,

              attempt:
                attempt + 1

            };
          }

          const liteResult =
            await callGeminiOnce(

              apiKey,

              GEMINI_MODELS[1],

              providerIndex

            );

          if (liteResult) {

            return {

              ...liteResult,

              attempt:
                attempt + 1

            };
          }
        }
      }

      if (
        providerIndex === 4
      ) {

        const result =
          await callOpenRouterOnce();

        if (result) {

          return {

            ...result,

            attempt:
              attempt + 1

            };
        }
      }
    }

    return null;
  }

  // ==========================================================
  // EXECUTE FAILOVER
  // ==========================================================

  const aiResult =
    await runFailover();

  // ==========================================================
  // AI FAILURE
  // ==========================================================

  if (!aiResult) {

    return res.status(503).json({

      ok:
        false,

      success:
        false,

      error:
        "لە دوو خولی 0→1→2→3→4 هیچ AI ـیەک وەڵامی نەدا.",

      retrySequence:
        "0→1→2→3→4→0→1→2→3→4",

      attempts:
        MAX_ATTEMPTS,

      diagnostics: {

        geminiKeys:
          GEMINI_KEYS.filter(
            Boolean
          ).length,

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
          market?.available === true,

        news:
          news?.available === true

      },

      timezone:
        "Asia/Baghdad",

      timezoneLabel:
        "کاتی عێراق",

      clock:
        "12-hour",

      currentIraqTime:
        iraqTime

    });
  }

  // ==========================================================
  // FINAL RESPONSE
  // ==========================================================

  return res.status(200).json({

    ok:
      true,

    success:
      true,

    answer:
      aiResult.answer,

    provider:
      aiResult.provider,

    model:
      aiResult.model,

    attempt:
      aiResult.attempt,

    retrySequence:
      "0→1→2→3→4→0→1→2→3→4",

    image:
      Boolean(image),

    liveData:
      true,

    generatedAt:
      liveContext.generatedAt,

    timezone:
      "Asia/Baghdad",

    timezoneLabel:
      "کاتی عێراق",

    clock:
      "12-hour",

    currentIraqTime:
      iraqTime,

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
        null,

      datetimeRaw:
        market?.current
          ?.datetimeRaw ??
        null,

      // ======================================================
      // SMC DATA
      // ======================================================

      smc:
        market?.smc ||
        null,

      marketStructure:
        market?.marketStructure ||
        null,

      bos:
        market?.bos ||
        [],

      choch:
        market?.choch ||
        [],

      displacement:
        market?.displacement ||
        [],

      liquidity:
        market?.liquidity ||
        [],

      liquiditySweeps:
        market?.liquiditySweeps ||
        [],

      premiumDiscount:
        market?.premiumDiscount ||
        null,

      setup:
        market?.setup ||
        null,

      summary:
        market?.summary ||
        null,

      // ======================================================
      // FVG + ORDER BLOCK
      // ======================================================

      fvgs:
        market?.fvgs ||
        [],

      orderBlocks:
        market?.orderBlocks ||
        []

    },

    news: {

      available:
        Boolean(
          news?.available
        ),

      timezone:
        "Asia/Baghdad",

      timezoneLabel:
        "کاتی عێراق",

      clock:
        "12-hour",

      events:
        Array.isArray(
          news?.events
        )
          ? news.events
          : []

    }

  });

}
