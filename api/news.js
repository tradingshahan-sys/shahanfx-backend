// api/news.js
// ShahanFX AI - LIVE Economic News
// تەنها ئەم فایلە بۆ News ـە.
// chat.js پێویست نییە دەستکاری بکرێت.

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
    "Content-Type, Authorization"
  );

  // گرنگ: هیچ cache ـێک نەکات
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
        "FMP_API_KEY نەدۆزرایەوە. تکایە FMP_API_KEY لە Vercel Environment Variables زیاد بکە."
    });
  }

  // =========================================================
  // HELPERS
  // =========================================================

  function isValidDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const date = new Date(value + "T00:00:00Z");

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }

  function todayUTC() {
    return new Date().toISOString().slice(0, 10);
  }

  function addDays(dateString, days) {
    const date = new Date(
      dateString + "T00:00:00Z"
    );

    date.setUTCDate(
      date.getUTCDate() + days
    );

    return date.toISOString().slice(0, 10);
  }

  function cleanString(value) {
    return value === null ||
      value === undefined
      ? ""
      : String(value).trim();
  }

  function getImpact(item) {
    return cleanString(
      item.impact ||
      item.importance ||
      item.priority ||
      ""
    );
  }

  function getCountry(item) {
    return cleanString(
      item.country ||
      item.countryName ||
      item.country_code ||
      ""
    );
  }

  function getEventName(item) {
    return cleanString(
      item.event ||
      item.name ||
      item.title ||
      item.description ||
      ""
    );
  }

  // =========================================================
  // REQUEST DATES
  // =========================================================

  const today = todayUTC();

  let from =
    req.query && req.query.from
      ? String(req.query.from).trim()
      : today;

  let to =
    req.query && req.query.to
      ? String(req.query.to).trim()
      : from;

  // ئەگەر date ـەکان خراپ بن، بگەڕێوە بۆ ئەمڕۆ
  if (!isValidDate(from)) {
    from = today;
  }

  if (!isValidDate(to)) {
    to = from;
  }

  // ئەگەر بە هەڵە from > to بوو
  if (from > to) {
    const temp = from;
    from = to;
    to = temp;
  }

  // =========================================================
  // FMP REQUEST
  // =========================================================

  const url =
    "https://financialmodelingprep.com/stable/economic-calendar" +
    "?from=" +
    encodeURIComponent(from) +
    "&to=" +
    encodeURIComponent(to) +
    "&apikey=" +
    encodeURIComponent(apiKey);

  const controller = new AbortController();

  // Timeout ـی 10 چرکە
  const timeout = setTimeout(function () {
    controller.abort();
  }, 10000);

  let response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "ShahanFX-AI-News"
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
      source: "FMP",
      from,
      to,
      count: 0,
      events: [],
      warning:
        error &&
        error.name === "AbortError"
          ? "FMP API ـەکە زۆر دواکەوت. تکایە دووبارە هەوڵ بدەوە."
          : error && error.message
            ? error.message
            : "نەتوانرا پەیوەندی بە FMP بکرێت."
    });
  } finally {
    clearTimeout(timeout);
  }

  // =========================================================
  // READ RESPONSE
  // =========================================================

  const rawText = await response.text();

  let data = null;

  try {
    data = JSON.parse(rawText);
  } catch {
    data = null;
  }

  // =========================================================
  // FMP ERROR
  // =========================================================

  if (!response.ok) {
    return res.status(200).json({
      ok: true,
      success: false,
      live: false,
      source: "FMP",
      from,
      to,
      count: 0,
      events: [],
      warning:
        "FMP API وەڵامی سەرکەوتوو نەدا.",
      status: response.status,
      details:
        typeof data === "object" && data !== null
          ? data.message ||
            data.error ||
            null
          : null
    });
  }

  // =========================================================
  // INVALID FMP RESPONSE
  // =========================================================

  if (!Array.isArray(data)) {
    return res.status(200).json({
      ok: true,
      success: false,
      live: false,
      source: "FMP",
      from,
      to,
      count: 0,
      events: [],
      warning:
        "FMP داتای Economic Calendar ـی دروستی نەگەڕاندەوە.",
      details:
        typeof data === "object" && data !== null
          ? data.message ||
            data.error ||
            null
          : null
    });
  }

  // =========================================================
  // IMPORTANT US ECONOMIC EVENTS
  // =========================================================

  const keywords = [
    "cpi",
    "core cpi",
    "nfp",
    "nonfarm",
    "non-farm",
    "fomc",
    "fed",
    "federal funds",
    "interest rate",
    "interest",
    "ppi",
    "gdp",
    "inflation",
    "unemployment",
    "unemployment rate",
    "retail sales",
    "ism",
    "employment",
    "jobs",
    "jobless claims",
    "initial jobless",
    "consumer confidence",
    "consumer sentiment",
    "pce",
    "core pce",
    "durable goods",
    "manufacturing",
    "services pmi",
    "manufacturing pmi"
  ];

  // =========================================================
  // FILTER + NORMALIZE
  // =========================================================

  const events = data
    .filter(function (item) {
      const country =
        getCountry(item).toLowerCase();

      const name =
        getEventName(item).toLowerCase();

      const impact =
        getImpact(item).toLowerCase();

      const isUS =
        country.includes("united states") ||
        country.includes("united states of america") ||
        country === "us" ||
        country === "usa" ||
        country === "u.s." ||
        country === "u.s.a." ||
        country.includes("america");

      const isImportant =
        impact.includes("high") ||
        impact.includes("medium") ||
        keywords.some(function (keyword) {
          return name.includes(
            keyword.toLowerCase()
          );
        });

      return isUS && isImportant;
    })
    .map(function (item) {
      const eventDate =
        item.date ||
        item.datetime ||
        item.time ||
        null;

      return {
        date: eventDate,

        country:
          getCountry(item) ||
          "United States",

        event:
          getEventName(item),

        impact:
          getImpact(item) || "Unknown",

        actual:
          item.actual !== undefined
            ? item.actual
            : null,

        estimate:
          item.estimate !== undefined
            ? item.estimate
            : item.forecast !== undefined
              ? item.forecast
              : null,

        previous:
          item.previous !== undefined
            ? item.previous
            : null,

        unit:
          item.unit !== undefined
            ? item.unit
            : null
      };
    })
    .filter(function (item) {
      return item.event !== "";
    })
    .slice(0, 100);

  // =========================================================
  // LIVE TIMESTAMP
  // =========================================================

  const fetchedAt =
    new Date().toISOString();

  // =========================================================
  // FINAL RESPONSE
  // =========================================================

  return res.status(200).json({
    ok: true,
    success: true,

    // ئەمە واتە داتا لە API ـەکەوە هاتووە
    live: true,

    source: "FMP",

    // کاتی وەرگرتنی داتا
    fetchedAt,

    // ئەمڕۆی سیستەم
    serverDate: today,

    from,
    to,

    count: events.length,

    events
  });
}
