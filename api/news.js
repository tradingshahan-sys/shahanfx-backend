export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "تەنها GET یان POST ڕێگەپێدراوە."
    });
  }

  try {
    const apiKey = process.env.FMP_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "FMP_API_KEY لە Vercel دانەنراوە."
      });
    }

    const input =
      req.method === "GET"
        ? (req.query || {})
        : (req.body || {});

    const action = String(input.action || "").toLowerCase();

    // بە default ئەمڕۆ + 7 ڕۆژی داهاتوو
    const now = new Date();

    const defaultFrom =
      new Date(now.getTime() - 7 * 86400000)
        .toISOString()
        .slice(0, 10);

    const defaultTo =
      new Date(now.getTime() + 7 * 86400000)
        .toISOString()
        .slice(0, 10);

    const from =
      input.startDate || defaultFrom;

    const to =
      input.endDate || defaultTo;

    const url = new URL(
      "https://financialmodelingprep.com/stable/economic-calendar"
    );

    url.searchParams.set("from", from);
    url.searchParams.set("to", to);
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error:
          data?.message ||
          "FMP API هەڵەیەکی گەڕاندەوە."
      });
    }

    if (data?.error) {
      return res.status(400).json({
        success: false,
        error: data.error
      });
    }

    const events =
      Array.isArray(data)
        ? data
        : [];

    // تەنها US
    const usEvents = events.filter(event => {
      const country = String(
        event?.country || ""
      ).toUpperCase();

      return (
        country === "US" ||
        country === "USA" ||
        country === "UNITED STATES"
      );
    });

    const normalize = event => ({
      date: event?.date || null,
      country: event?.country || null,

      event:
        event?.event ||
        event?.name ||
        null,

      impact:
        event?.impact ||
        event?.importance ||
        null,

      actual:
        event?.actual ?? null,

      forecast:
        event?.estimate ??
        event?.forecast ??
        null,

      previous:
        event?.previous ?? null,

      unit:
        event?.unit || null,

      currency:
        event?.currency || "USD"
    });

    const normalized =
      usEvents.map(normalize);

    // =========================
    // CPI
    // =========================

    const cpi = normalized.filter(event => {
      const name = String(
        event.event || ""
      ).toLowerCase();

      return (
        name.includes("cpi") ||
        name.includes("consumer price index")
      );
    });

    // =========================
    // NFP
    // =========================

    const nfp = normalized.filter(event => {
      const name = String(
        event.event || ""
      ).toLowerCase();

      return (
        name.includes("non farm") ||
        name.includes("non-farm") ||
        name.includes("nonfarm") ||
        name.includes("payroll")
      );
    });

    // =========================
    // FOMC / RATE
    // =========================

    const fomc = normalized.filter(event => {
      const name = String(
        event.event || ""
      ).toLowerCase();

      return (
        name.includes("fomc") ||
        name.includes("federal funds") ||
        name.includes("interest rate")
      );
    });

    // =========================
    // PPI
    // =========================

    const ppi = normalized.filter(event => {
      const name = String(
        event.event || ""
      ).toLowerCase();

      return (
        name.includes("ppi") ||
        name.includes("producer price")
      );
    });

    // =========================
    // IMPORTANT
    // =========================

    const importantKeywords = [
      "cpi",
      "consumer price index",
      "non farm",
      "non-farm",
      "nonfarm",
      "payroll",
      "fomc",
      "federal funds",
      "interest rate",
      "ppi",
      "producer price",
      "gdp",
      "gross domestic product",
      "unemployment",
      "retail sales",
      "initial jobless claims",
      "ism",
      "pmi",
      "federal reserve",
      "powell"
    ];

    const importantNews =
      normalized.filter(event => {
        const name = String(
          event.event || ""
        ).toLowerCase();

        return importantKeywords.some(
          keyword =>
            name.includes(keyword)
        );
      });

    // =========================
    // ACTION=CPI
    // =========================

    if (action === "cpi") {
      return res.status(200).json({
        success: true,
        found: cpi.length > 0,
        type: "CPI",
        source: "Financial Modeling Prep",

        range: {
          from,
          to
        },

        count: cpi.length,

        message:
          cpi.length > 0
            ? "CPI دۆزرایەوە."
            : "لە ماوەی پشکنینکراودا CPI نەدۆزرایەوە.",

        cpi
      });
    }

    // =========================
    // ACTION=NFP
    // =========================

    if (action === "nfp") {
      return res.status(200).json({
        success: true,
        found: nfp.length > 0,
        type: "NFP",
        count: nfp.length,
        nfp
      });
    }

    // =========================
    // ACTION=FOMC
    // =========================

    if (action === "fomc") {
      return res.status(200).json({
        success: true,
        found: fomc.length > 0,
        type: "FOMC",
        count: fomc.length,
        fomc
      });
    }

    // =========================
    // ACTION=PPI
    // =========================

    if (action === "ppi") {
      return res.status(200).json({
        success: true,
        found: ppi.length > 0,
        type: "PPI",
        count: ppi.length,
        ppi
      });
    }

    // =========================
    // DEFAULT
    // =========================

    return res.status(200).json({
      success: true,

      source:
        "Financial Modeling Prep",

      timestamp:
        new Date().toISOString(),

      range: {
        from,
        to
      },

      summary: {
        totalUSEvents:
          normalized.length,

        important:
          importantNews.length,

        cpi:
          cpi.length,

        nfp:
          nfp.length,

        fomc:
          fomc.length,

        ppi:
          ppi.length
      },

      importantNews,
      cpi,
      nfp,
      fomc,
      ppi,
      events: normalized
    });

  } catch (error) {
    console.error(
      "SHAHANFX NEWS ENGINE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "هەڵەی ناوخۆی ShahanFX News Engine ڕوویدا.",
      details:
        error?.message || null
    });
  }
}
