// api/news.js
// ShahanFX AI - Economic News API

export default async function handler(req, res) {
  // ================================
  // CORS
  // ================================
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.setHeader("Cache-Control", "no-store");

  // ================================
  // OPTIONS
  // ================================
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // ================================
  // ONLY GET
  // ================================
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "تەنها GET ڕێگەپێدراوە."
    });
  }

  // ================================
  // API KEY
  // ================================
  const FMP_API_KEY = process.env.FMP_API_KEY;

  if (!FMP_API_KEY) {
    return res.status(500).json({
      ok: false,
      error: "FMP_API_KEY لە Environment Variables ـدا نییە."
    });
  }

  // ================================
  // DATE
  // ================================
  const today = new Date();

  const defaultDate =
    today.toISOString().slice(0, 10);

  const from =
    typeof req.query?.from === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(req.query.from)
      ? req.query.from
      : defaultDate;

  const to =
    typeof req.query?.to === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(req.query.to)
      ? req.query.to
      : from;

  // ================================
  // FMP REQUEST
  // ================================
  try {
    const url =
      "https://financialmodelingprep.com/stable/economic-calendar" +
      `?from=${encodeURIComponent(from)}` +
      `&to=${encodeURIComponent(to)}` +
      `&apikey=${encodeURIComponent(FMP_API_KEY)}`;

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 8000);

    let response;

    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    // ================================
    // FMP HTTP ERROR
    // ================================
    if (!response.ok) {
      const errorText =
        await response.text().catch(() => "");

      return res.status(502).json({
        ok: false,
        error: "FMP API وەڵامی دروستی نەدا.",
        status: response.status,
        details: errorText.slice(0, 500)
      });
    }

    // ================================
    // PARSE JSON
    // ================================
    const data = await response.json();

    if (!Array.isArray(data)) {
      return res.status(502).json({
        ok: false,
        error: "داتای Economic Calendar دروست نییە.",
        data
      });
    }

    // ================================
    // IMPORTANT EVENTS
    // ================================
    const keywords = [
      "CPI",
      "NFP",
      "FOMC",
      "FED",
      "PPI",
      "GDP",
      "interest rate",
      "interest",
      "nonfarm",
      "inflation",
      "unemployment",
      "retail sales",
      "ISM",
      "employment",
      "jobs"
    ];

    const events = data
      .filter((item) => {
        const country = String(
          item.country ||
          item.countryName ||
          ""
        ).toLowerCase();

        const event = String(
          item.event ||
          item.name ||
          item.title ||
          ""
        ).toLowerCase();

        const impact = String(
          item.impact ||
          item.importance ||
          ""
        ).toLowerCase();

        const isUS =
          country.includes("united states") ||
          country === "us" ||
          country === "usa";

        const isImportant =
          impact.includes("high") ||
          impact.includes("medium") ||
          keywords.some((keyword) =>
            event.includes(keyword.toLowerCase())
          );

        return isUS && isImportant;
      })
      .map((item) => ({
        date:
          item.date ||
          item.datetime ||
          null,

        country:
          item.country ||
          item.countryName ||
          "United States",

        event:
          item.event ||
          item.name ||
          item.title ||
          "",

        impact:
          item.impact ||
          item.importance ||
          "",

        actual:
          item.actual ?? null,

        estimate:
          item.estimate ??
          item.forecast ??
          null,

        previous:
          item.previous ?? null
      }))
      .slice(0, 50);

    // ================================
    // SUCCESS
    // ================================
    return res.status(200).json({
      ok: true,
      success: true,
      source: "Financial Modeling Prep",
      from,
      to,
      count: events.length,
      events
    });

  } catch (error) {
    // ================================
    // TIMEOUT
    // ================================
    if (error?.name === "AbortError") {
      return res.status(504).json({
        ok: false,
        error:
          "FMP API زۆر خاو بوو و کاتی داواکاری تەواو بوو."
      });
    }

    // ================================
    // UNKNOWN ERROR
    // ================================
    return res.status(500).json({
      ok: false,
      error:
        "هەڵەیەکی نەخوازراو لە News API ڕوویدا.",
      details:
        error?.message || "Unknown error"
    });
  }
}
