// api/news.js
// ShahanFX AI
// Xoomar Economic Calendar
// No FMP required
// No API key required

export default async function handler(req, res) {
  // =========================================================
  // CORS
  // =========================================================
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  // =========================================================
  // NO CACHE
  // =========================================================
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  // =========================================================
  // OPTIONS
  // =========================================================
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // =========================================================
  // GET ONLY
  // =========================================================
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      success: false,
      error: "تەنها GET ڕێگەپێدراوە."
    });
  }

  // =========================================================
  // DATE HELPERS
  // =========================================================

  function getTodayUTC() {
    return new Date()
      .toISOString()
      .slice(0, 10);
  }

  function isValidDate(value) {
    if (
      typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
      return false;
    }

    const d = new Date(
      value + "T00:00:00Z"
    );

    return (
      !Number.isNaN(d.getTime()) &&
      d.toISOString().slice(0, 10) === value
    );
  }

  function getQuery(name) {
    if (!req.query) return null;

    const value = req.query[name];

    if (
      value === undefined ||
      value === null
    ) {
      return null;
    }

    if (Array.isArray(value)) {
      return value[0] || null;
    }

    return String(value).trim();
  }

  // =========================================================
  // TODAY
  // =========================================================

  const today = getTodayUTC();

  // بە default:
  // ئەمڕۆ + 7 ڕۆژی داهاتوو
  //
  // ئەمە وای دەکات هەواڵ/ئێڤێنتی گرنگی داهاتووش
  // لە Calendar ـدا پیشان بدرێت.
  let from = getQuery("from");
  let to = getQuery("to");

  if (!isValidDate(from)) {
    from = today;
  }

  if (!isValidDate(to)) {
    const future = new Date(
      today + "T00:00:00Z"
    );

    future.setUTCDate(
      future.getUTCDate() + 7
    );

    to = future
      .toISOString()
      .slice(0, 10);
  }

  // =========================================================
  // XOOMAR API
  // =========================================================
  //
  // Official Xoomar endpoint:
  //
  // https://xoomar.com/api/markets/calendar
  //
  // importance=high
  //
  // No API key required.
  // =========================================================

  const url =
    "https://xoomar.com/api/markets/calendar" +
    "?from=" +
    encodeURIComponent(from) +
    "&to=" +
    encodeURIComponent(to) +
    "&importance=high";

  // =========================================================
  // TIMEOUT
  // =========================================================

  const controller =
    new AbortController();

  const timeout = setTimeout(
    function () {
      controller.abort();
    },
    10000
  );

  let response;

  try {
    response = await fetch(url, {
      method: "GET",

      headers: {
        Accept: "application/json",
        "User-Agent":
          "ShahanFX-AI/1.0"
      },

      cache: "no-store",

      signal: controller.signal
    });
  } catch (error) {
    clearTimeout(timeout);

    return res.status(200).json({
      ok: true,
      success: false,
      live: false,

      source: "Xoomar",

      from,
      to,

      fetchedAt:
        new Date().toISOString(),

      count: 0,

      events: [],

      warning:
        error &&
        error.name === "AbortError"
          ? "Xoomar API timeout ـی کرد."
          : error &&
              error.message
            ? error.message
            : "نەتوانرا پەیوەندی بە Xoomar بکرێت."
    });
  } finally {
    clearTimeout(timeout);
  }

  // =========================================================
  // RESPONSE
  // =========================================================

  const rawText =
    await response.text();

  let result = null;

  try {
    result = JSON.parse(rawText);
  } catch {
    result = null;
  }

  // =========================================================
  // XOOMAR ERROR
  // =========================================================

  if (!response.ok) {
    return res.status(200).json({
      ok: true,
      success: false,
      live: false,

      source: "Xoomar",

      from,
      to,

      fetchedAt:
        new Date().toISOString(),

      count: 0,

      events: [],

      status: response.status,

      warning:
        "Xoomar API وەڵامی سەرکەوتوو نەدا.",

      details:
        result &&
        typeof result === "object"
          ? result.message ||
            result.error ||
            null
          : null
    });
  }

  // =========================================================
  // XOOMAR RESPONSE FORMAT
  // =========================================================
  //
  // {
  //   data: [],
  //   updatedAt: "...",
  //   source: "...",
  //   docs: "..."
  // }
  // =========================================================

  if (
    !result ||
    !Array.isArray(result.data)
  ) {
    return res.status(200).json({
      ok: true,
      success: false,
      live: false,

      source: "Xoomar",

      from,
      to,

      fetchedAt:
        new Date().toISOString(),

      count: 0,

      events: [],

      warning:
        "Xoomar داتای Economic Calendar ـی دروستی نەگەڕاندەوە."
    });
  }

  // =========================================================
  // NORMALIZE EVENTS
  // =========================================================

  const events = result.data
    .map(function (item) {
      return {
        source:
          item.source ||
          null,

        event:
          item.eventName ||
          item.event ||
          item.name ||
          "",

        importance:
          item.importance ||
          "high",

        scheduledAt:
          item.scheduledAt ||
          item.date ||
          item.datetime ||
          null,

        periodLabel:
          item.periodLabel ||
          null,

        previous:
          item.previous !== undefined
            ? item.previous
            : null,

        actual:
          item.actual !== undefined
            ? item.actual
            : null,

        // Xoomar forecast نادات
        // بۆیە هیچ forecast ـێک دروست ناکەین.
        estimate: null
      };
    })
    .filter(function (item) {
      return item.event !== "";
    });

  // =========================================================
  // SORT BY TIME
  // =========================================================

  events.sort(
    function (a, b) {
      const aTime =
        a.scheduledAt
          ? new Date(
              a.scheduledAt
            ).getTime()
          : 0;

      const bTime =
        b.scheduledAt
          ? new Date(
              b.scheduledAt
            ).getTime()
          : 0;

      return aTime - bTime;
    }
  );

  // =========================================================
  // IMPORTANT KEYWORDS
  // =========================================================

  const keywords = [
    "CPI",
    "Consumer Price",
    "Nonfarm",
    "Payroll",
    "Employment",
    "FOMC",
    "Fed",
    "Federal Reserve",
    "GDP",
    "PCE",
    "Inflation",
    "Interest Rate",
    "Jobs"
  ];

  const importantEvents =
    events.filter(
      function (item) {
        const name =
          String(
            item.event || ""
          ).toLowerCase();

        return keywords.some(
          function (keyword) {
            return name.includes(
              keyword.toLowerCase()
            );
          }
        );
      }
    );

  // =========================================================
  // LIVE STATUS
  // =========================================================

  const fetchedAt =
    new Date().toISOString();

  const updatedAt =
    result.updatedAt ||
    null;

  // =========================================================
  // FINAL RESPONSE
  // =========================================================

  return res.status(200).json({
    ok: true,

    success: true,

    live: true,

    source: "Xoomar",

    provider:
      "Xoomar Pulse",

    from,

    to,

    fetchedAt,

    updatedAt,

    count:
      events.length,

    importantCount:
      importantEvents.length,

    events,

    // هەمان data ـەی Xoomar
    // بۆ ئەوەی دواتر ئەگەر پێویست بوو
    // بتوانین بە ئاسانی بەکاری بهێنین.
    xoomar: {
      source:
        result.source ||
        "xoomar.com",

      docs:
        result.docs ||
        "https://xoomar.com/markets/api"
    }
  });
}
