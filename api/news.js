export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

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

    // ================================
    // DATE
    // ================================

    const now = new Date();

    const baghdadDate =
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Baghdad",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(now);

    const startDate =
      input.startDate || baghdadDate;

    // 7 ڕۆژ بۆ ئەوەی CPI لەگەڵ کاتژمێری جیاواز ون نەبێت
    const endDate =
      input.endDate ||
      new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .slice(0, 10);

    // ================================
    // FMP
    // ================================

    const url = new URL(
      "https://financialmodelingprep.com/stable/economic-calendar"
    );

    url.searchParams.set("from", startDate);
    url.searchParams.set("to", endDate);
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(
      url.toString(),
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      }
    );

    const raw = await response.text();

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }

    if (!response.ok) {
      console.error("FMP HTTP ERROR:", data);

      return res.status(400).json({
        success: false,
        provider: "FMP",
        httpStatus: response.status,
        error:
          data?.message ||
          data?.error ||
          "FMP داواکارییەکەی ڕەتکردەوە.",
        raw: data
      });
    }

    if (!Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        provider: "FMP",
        error:
          data?.message ||
          data?.error ||
          "FMP لیستی Economic Calendar نەگەڕاندەوە.",
        raw: data
      });
    }

    // ================================
    // NORMALIZE
    // ================================

    const events = data.map(event => ({
      date: event?.date || null,

      country:
        event?.country ||
        null,

      event:
        event?.event ||
        event?.name ||
        null,

      impact:
        event?.impact ??
        event?.importance ??
        null,

      actual:
        event?.actual ??
        null,

      forecast:
        event?.estimate ??
        event?.forecast ??
        null,

      previous:
        event?.previous ??
        null,

      unit:
        event?.unit ||
        null,

      currency:
        event?.currency ||
        null
    }));

    // ================================
    // US EVENTS
    // ================================

    const usEvents = events.filter(event => {
      const country =
        String(event.country || "")
          .toUpperCase()
          .trim();

      return (
        country === "US" ||
        country === "USA" ||
        country === "UNITED STATES" ||
        country === "UNITED STATES OF AMERICA"
      );
    });

    // ================================
    // IMPORTANT KEYWORDS
    // ================================

    const keywords = [
      "cpi",
      "consumer price index",
      "non farm payroll",
      "non-farm payroll",
      "nonfarm payroll",
      "nfp",
      "fomc",
      "federal funds",
      "interest rate",
      "ppi",
      "producer price",
      "gdp",
      "unemployment",
      "retail sales",
      "initial jobless",
      "pmi",
      "ism",
      "federal reserve",
      "fed",
      "powell"
    ];

    const importantNews =
      usEvents.filter(event => {
        const name =
          String(event.event || "")
            .toLowerCase();

        return keywords.some(keyword =>
          name.includes(keyword)
        );
      });

    // ================================
    // CPI
    // ================================

    const cpi =
      usEvents.filter(event => {
        const name =
          String(event.event || "")
            .toLowerCase();

        return (
          name.includes("cpi") ||
          name.includes(
            "consumer price index"
          )
        );
      });

    // ================================
    // NFP
    // ================================

    const nfp =
      usEvents.filter(event => {
        const name =
          String(event.event || "")
            .toLowerCase();

        return (
          name.includes("non farm") ||
          name.includes("non-farm") ||
          name.includes("nonfarm") ||
          name.includes("payroll")
        );
      });

    // ================================
    // FOMC
    // ================================

    const fomc =
      usEvents.filter(event => {
        const name =
          String(event.event || "")
            .toLowerCase();

        return (
          name.includes("fomc") ||
          name.includes("federal funds") ||
          name.includes("interest rate")
        );
      });

    // ================================
    // PPI
    // ================================

    const ppi =
      usEvents.filter(event => {
        const name =
          String(event.event || "")
            .toLowerCase();

        return (
          name.includes("ppi") ||
          name.includes("producer price")
        );
      });

    // ================================
    // RESPONSE
    // ================================

    return res.status(200).json({
      success: true,

      provider: "Financial Modeling Prep",

      range: {
        from: startDate,
        to: endDate
      },

      totals: {
        all: events.length,
        us: usEvents.length,
        important: importantNews.length,
        cpi: cpi.length,
        nfp: nfp.length,
        fomc: fomc.length,
        ppi: ppi.length
      },

      cpi,
      nfp,
      fomc,
      ppi,

      importantNews,

      events: usEvents
    });

  } catch (error) {
    console.error(
      "SHAHANFX NEWS ENGINE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "هەڵەی ناوخۆی News Engine ڕوویدا.",
      details:
        error?.message || null
    });
  }
}
