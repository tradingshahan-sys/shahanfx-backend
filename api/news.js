export default async function handler(req, res) {

  // =========================================================
  // SHAHANFX NEWS ENGINE
  // Economic Calendar • CPI • NFP • FOMC • GDP • PPI
  // =========================================================

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

    // =======================================================
    // API KEY
    // =======================================================

    const apiKey = process.env.FMP_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error:
          "FMP_API_KEY لە Vercel Environment Variables دانەنراوە."
      });
    }

    // =======================================================
    // INPUT
    // =======================================================

    const input =
      req.method === "GET"
        ? (req.query || {})
        : (req.body || {});

    // =======================================================
    // DATE RANGE
    // =======================================================

    const now = new Date();

    const defaultFrom =
      now.toISOString().slice(0, 10);

    const futureDate =
      new Date(now);

    futureDate.setDate(
      futureDate.getDate() + 7
    );

    const defaultTo =
      futureDate.toISOString().slice(0, 10);

    const from =
      typeof input.from === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(input.from)
        ? input.from
        : defaultFrom;

    const to =
      typeof input.to === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(input.to)
        ? input.to
        : defaultTo;

    // =======================================================
    // FMP STABLE ECONOMIC CALENDAR
    // =======================================================

    const url = new URL(
      "https://financialmodelingprep.com/stable/economic-calendar"
    );

    url.searchParams.set("from", from);
    url.searchParams.set("to", to);
    url.searchParams.set("apikey", apiKey);

    const response =
      await fetch(url.toString());

    const rawData =
      await response.json();

    // =======================================================
    // API ERROR
    // =======================================================

    if (!response.ok) {

      console.error(
        "FMP HTTP Error:",
        response.status,
        rawData
      );

      return res.status(response.status).json({
        success: false,
        source: "FMP",
        error:
          rawData?.message ||
          rawData?.error ||
          `FMP HTTP ${response.status}`
      });
    }

    if (
      rawData &&
      !Array.isArray(rawData) &&
      (
        rawData.error ||
        rawData.message
      )
    ) {

      return res.status(400).json({
        success: false,
        source: "FMP",
        error:
          rawData.message ||
          rawData.error
      });
    }

    const events =
      Array.isArray(rawData)
        ? rawData
        : [];

    // =======================================================
    // IMPORTANT EVENTS
    // =======================================================

    const importantPatterns = [

      // Inflation
      "CPI",
      "CONSUMER PRICE",
      "INFLATION",

      // Employment
      "NON FARM",
      "NONFARM",
      "NFP",
      "PAYROLL",
      "UNEMPLOYMENT",
      "JOBLESS",
      "EMPLOYMENT",
      "ADP",

      // Central Banks
      "FOMC",
      "FEDERAL FUNDS",
      "FED INTEREST",
      "INTEREST RATE",
      "POLICY RATE",
      "FEDERAL RESERVE",
      "POWELL",

      // Growth
      "GDP",
      "GROSS DOMESTIC",

      // Producer prices
      "PPI",
      "PRODUCER PRICE",

      // Spending / Consumption
      "RETAIL SALES",
      "CONSUMER CONFIDENCE",
      "CONSUMER SENTIMENT",

      // PMI
      "PMI",
      "ISM",

      // Other major events
      "DURABLE GOODS",
      "CORE CPI",
      "CORE PPI",
      "PERSONAL CONSUMPTION",
      "PCE",
      "CORE PCE"
    ];

    // =======================================================
    // USD COUNTRIES
    // =======================================================

    const usdCountries = [
      "US",
      "USA",
      "UNITED STATES",
      "USD"
    ];

    // =======================================================
    // NORMALIZE EVENTS
    // =======================================================

    const normalized = events.map((event) => {

      const eventName =
        String(
          event.event ||
          event.name ||
          event.title ||
          ""
        );

      const country =
        String(
          event.country ||
          event.currency ||
          event.countryName ||
          ""
        );

      const text =
        JSON.stringify(event)
          .toUpperCase();

      const important =
        importantPatterns.some(
          pattern =>
            text.includes(
              pattern
            )
        );

      const usdRelated =
        usdCountries.some(
          countryName =>
            country
              .toUpperCase()
              .includes(countryName)
        ) ||
        text.includes('"USD"') ||
        text.includes("UNITED STATES");

      return {

        date:
          event.date ||
          event.datetime ||
          null,

        event:
          eventName,

        country:
          country,

        currency:
          event.currency ||
          (usdRelated ? "USD" : null),

        importance:
          event.importance ||
          event.impact ||
          event.priority ||
          null,

        actual:
          event.actual ??
          event.value ??
          event.current ??
          null,

        forecast:
          event.forecast ??
          event.estimate ??
          event.consensus ??
          null,

        previous:
          event.previous ??
          event.prev ??
          null,

        unit:
          event.unit ||
          null,

        source:
          "Financial Modeling Prep",

        important,

        usdRelated,

        raw:
          event
      };

    });

    // =======================================================
    // FILTER
    // =======================================================

    const importantEvents =
      normalized.filter(
        event =>
          event.important &&
          event.usdRelated
      );

    // =======================================================
    // FALLBACK
    // =======================================================

    const finalEvents =
      importantEvents.length > 0
        ? importantEvents
        : normalized.filter(
            event =>
              event.important
          );

    // =======================================================
    // SORT BY DATE
    // =======================================================

    finalEvents.sort(
      (a, b) => {

        const dateA =
          new Date(
            a.date || 0
          ).getTime();

        const dateB =
          new Date(
            b.date || 0
          ).getTime();

        return dateA - dateB;

      }
    );

    // =======================================================
    // HIGH IMPACT DETECTION
    // =======================================================

    const highImpactEvents =
      finalEvents.filter(
        event => {

          const text =
            `${event.event} ${
              event.importance || ""
            }`.toUpperCase();

          return (

            text.includes("CPI") ||

            text.includes("NFP") ||

            text.includes("NON FARM") ||

            text.includes("FOMC") ||

            text.includes("INTEREST RATE") ||

            text.includes("GDP") ||

            text.includes("PPI") ||

            text.includes("UNEMPLOYMENT") ||

            text.includes("PCE")

          );

        }
      );

    // =======================================================
    // CPI EVENTS
    // =======================================================

    const cpiEvents =
      finalEvents.filter(
        event => {

          const text =
            event.event.toUpperCase();

          return (
            text.includes("CPI") ||
            text.includes("CONSUMER PRICE")
          );

        }
      );

    // =======================================================
    // NFP EVENTS
    // =======================================================

    const nfpEvents =
      finalEvents.filter(
        event => {

          const text =
            event.event.toUpperCase();

          return (
            text.includes("NFP") ||
            text.includes("NON FARM") ||
            text.includes("NONFARM") ||
            text.includes("PAYROLL")
          );

        }
      );

    // =======================================================
    // FOMC EVENTS
    // =======================================================

    const fomcEvents =
      finalEvents.filter(
        event => {

          const text =
            event.event.toUpperCase();

          return (
            text.includes("FOMC") ||
            text.includes("FEDERAL FUNDS") ||
            text.includes("INTEREST RATE") ||
            text.includes("FEDERAL RESERVE")
          );

        }
      );

    // =======================================================
    // NEWS STATUS
    // =======================================================

    let status =
      "no_major_news";

    if (highImpactEvents.length > 0) {
      status =
        "major_news_detected";
    }

    // =======================================================
    // RESPONSE
    // =======================================================

    return res.status(200).json({

      success: true,

      source:
        "Financial Modeling Prep",

      status,

      from,

      to,

      timestamp:
        new Date().toISOString(),

      totalEvents:
        events.length,

      importantEvents:
        finalEvents.length,

      highImpactEvents:
        highImpactEvents.length,

      categories: {

        CPI:
          cpiEvents,

        NFP:
          nfpEvents,

        FOMC:
          fomcEvents

      },

      events:
        finalEvents

    });

  } catch (error) {

    console.error(
      "ShahanFX News Error:",
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
