// api/news.js
// ShahanFX AI - LIVE FOREX NEWS
// تەنها ئەم فایلە دەستکاری دەکرێت.
// chat.js هیچ دەستکاری ناکرێت.

export default async function handler(req, res) {
  // =========================================================
  // CORS + NO CACHE
  // =========================================================
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

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
  // API KEY
  // =========================================================
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    return res.status(200).json({
      ok: true,
      success: false,
      live: false,
      source: "FMP",
      count: 0,
      events: [],
      warning:
        "FMP_API_KEY نەدۆزرایەوە."
    });
  }

  // =========================================================
  // HELPERS
  // =========================================================

  function getQuery(name) {
    if (!req.query) return null;

    const value = req.query[name];

    if (Array.isArray(value)) {
      return value[0] || null;
    }

    if (
      value === undefined ||
      value === null
    ) {
      return null;
    }

    return String(value).trim();
  }

  function clean(value) {
    if (
      value === undefined ||
      value === null
    ) {
      return "";
    }

    return String(value).trim();
  }

  // =========================================================
  // CURRENT TIME
  // =========================================================

  const fetchedAt =
    new Date().toISOString();

  // =========================================================
  // LIVE FOREX NEWS ENDPOINT
  // =========================================================
  //
  // FMP:
  // /stable/news/forex-latest?page=0&limit=20
  //
  // ئەمە Forex News ـە، نە Economic Calendar.
  // =========================================================

  const page =
    Number(getQuery("page")) >= 0
      ? Number(getQuery("page"))
      : 0;

  const requestedLimit =
    Number(getQuery("limit"));

  const limit =
    Number.isFinite(requestedLimit) &&
    requestedLimit >= 1 &&
    requestedLimit <= 50
      ? requestedLimit
      : 30;

  const url =
    "https://financialmodelingprep.com/stable/news/forex-latest" +
    "?page=" +
    encodeURIComponent(page) +
    "&limit=" +
    encodeURIComponent(limit) +
    "&apikey=" +
    encodeURIComponent(apiKey);

  // =========================================================
  // TIMEOUT
  // =========================================================

  const controller =
    new AbortController();

  const timeout = setTimeout(function () {
    controller.abort();
  }, 10000);

  let response;

  try {
    response = await fetch(url, {
      method: "GET",

      headers: {
        Accept: "application/json",
        "User-Agent":
          "ShahanFX-AI-News/1.0"
      },

      signal: controller.signal,

      cache: "no-store"
    });
  } catch (error) {
    clearTimeout(timeout);

    return res.status(200).json({
      ok: true,
      success: false,
      live: false,

      source: "FMP Forex News",

      fetchedAt,

      count: 0,

      events: [],

      warning:
        error &&
        error.name === "AbortError"
          ? "FMP Forex News timeout ـی کرد."
          : error &&
              error.message
            ? error.message
            : "نەتوانرا پەیوەندی بە FMP Forex News بکرێت."
    });
  } finally {
    clearTimeout(timeout);
  }

  // =========================================================
  // READ RESPONSE
  // =========================================================

  const rawText =
    await response.text();

  let data = null;

  try {
    data = JSON.parse(rawText);
  } catch {
    data = null;
  }

  // =========================================================
  // API ERROR
  // =========================================================

  if (!response.ok) {
    return res.status(200).json({
      ok: true,
      success: false,
      live: false,

      source: "FMP Forex News",

      fetchedAt,

      count: 0,

      events: [],

      status: response.status,

      warning:
        "FMP Forex News API وەڵامی سەرکەوتوو نەدا.",

      details:
        data &&
        typeof data === "object"
          ? data.message ||
            data.error ||
            null
          : null
    });
  }

  // =========================================================
  // CHECK ARRAY
  // =========================================================

  if (!Array.isArray(data)) {
    return res.status(200).json({
      ok: true,
      success: false,
      live: false,

      source: "FMP Forex News",

      fetchedAt,

      count: 0,

      events: [],

      warning:
        "FMP Forex News داتای دروستی نەگەڕاندەوە."
    });
  }

  // =========================================================
  // IMPORTANT NEWS KEYWORDS
  // =========================================================

  const importantKeywords = [
    "fed",
    "federal reserve",
    "fomc",
    "interest rate",
    "rate decision",
    "cpi",
    "inflation",
    "ppi",
    "nfp",
    "nonfarm",
    "employment",
    "unemployment",
    "payroll",
    "gdp",
    "pce",
    "retail sales",
    "ism",
    "jobs",
    "treasury",
    "powell",
    "central bank",
    "dollar",
    "usd",
    "gold",
    "xau"
  ];

  // =========================================================
  // NORMALIZE NEWS
  // =========================================================

  const events = data
    .map(function (item) {
      const title =
        clean(
          item.title ||
          item.headline ||
          item.name
        );

      const text =
        clean(
          item.text ||
          item.content ||
          item.description ||
          item.snippet
        );

      const combined =
        (
          title +
          " " +
          text
        ).toLowerCase();

      const important =
        importantKeywords.some(
          function (keyword) {
            return combined.includes(
              keyword
            );
          }
        );

      return {
        title,

        text,

        url:
          clean(
            item.url ||
            item.link ||
            item.articleURL
          ) || null,

        site:
          clean(
            item.site ||
            item.source ||
            item.publisher
          ) || "Unknown",

        publishedDate:
          item.publishedDate ||
          item.published_at ||
          item.date ||
          item.datetime ||
          null,

        symbol:
          clean(
            item.symbol ||
            item.pair ||
            ""
          ) || null,

        important
      };
    })
    .filter(function (item) {
      return item.title !== "";
    });

  // =========================================================
  // SORT NEWEST FIRST
  // =========================================================

  events.sort(
    function (a, b) {
      const aTime = a.publishedDate
        ? new Date(
            a.publishedDate
          ).getTime()
        : 0;

      const bTime = b.publishedDate
        ? new Date(
            b.publishedDate
          ).getTime()
        : 0;

      return bTime - aTime;
    }
  );

  // =========================================================
  // LIMIT
  // =========================================================

  const finalEvents =
    events.slice(0, limit);

  // =========================================================
  // IMPORTANT EVENTS
  // =========================================================

  const importantEvents =
    finalEvents.filter(
      function (item) {
        return item.important;
      }
    );

  // =========================================================
  // FINAL RESPONSE
  // =========================================================

  return res.status(200).json({
    ok: true,

    success: true,

    // تەنها کاتێک true ـە کە API ـەکە
    // بە سەرکەوتوویی داتا گەڕاندبێتەوە.
    live: true,

    source: "FMP Forex News",

    fetchedAt,

    serverTime:
      new Date().toISOString(),

    page,

    limit,

    count:
      finalEvents.length,

    importantCount:
      importantEvents.length,

    events:
      finalEvents
  });
}
