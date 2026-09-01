export default async function handler(req, res) {

  /*
   * =========================================================
   * SHAHANFX NEWS ENGINE PRO
   * FMP Economic Calendar
   * CPI • NFP • FOMC • PPI • GDP • Rates
   * =========================================================
   */

  // =========================================================
  // CORS
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

  // =========================================================
  // METHOD
  // =========================================================

  if (req.method !== "GET" && req.method !== "POST") {

    return res.status(405).json({
      success: false,
      error: "تەنها GET یان POST ڕێگەپێدراوە."
    });

  }

  try {

    // =======================================================
    // FMP API KEY
    // =======================================================

    const apiKey =
      process.env.FMP_API_KEY;

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
    // DATE
    // =======================================================

    const today =
      new Date();

    const startDate =
      input.startDate ||
      today.toISOString().slice(0, 10);

    const endDate =
      input.endDate ||
      startDate;

    // =======================================================
    // FMP URL
    // =======================================================

    const url =
      new URL(
        "https://financialmodelingprep.com/stable/economic-calendar"
      );

    url.searchParams.set(
      "from",
      startDate
    );

    url.searchParams.set(
      "to",
      endDate
    );

    url.searchParams.set(
      "apikey",
      apiKey
    );

    // =======================================================
    // REQUEST
    // =======================================================

    const response =
      await fetch(
        url.toString(),
        {
          method: "GET",
          headers: {
            "Accept":
              "application/json"
          }
        }
      );

    const data =
      await response.json();

    // =======================================================
    // ERROR
    // =======================================================

    if (!response.ok) {

      console.error(
        "FMP HTTP Error:",
        data
      );

      return res.status(
        response.status
      ).json({

        success: false,

        error:
          data?.message ||
          "FMP News API هەڵەیەکی گەڕاندەوە."

      });

    }

    if (
      data &&
      data.error
    ) {

      console.error(
        "FMP API Error:",
        data
      );

      return res.status(400).json({

        success: false,

        error:
          data.error

      });

    }

    // =======================================================
    // NORMALIZE DATA
    // =======================================================

    const events =
      Array.isArray(data)
        ? data
        : [];

    // =======================================================
    // IMPORTANT FOREX NEWS
    // =======================================================

    const importantKeywords = [

      "CPI",
      "Consumer Price Index",

      "Non Farm Payrolls",
      "Non-Farm Payrolls",
      "Nonfarm Payrolls",
      "NFP",

      "Federal Funds Rate",
      "Interest Rate",

      "FOMC",

      "PPI",
      "Producer Price Index",

      "GDP",
      "Gross Domestic Product",

      "Unemployment Rate",

      "Initial Jobless Claims",

      "Retail Sales",

      "ISM Manufacturing",

      "ISM Services",

      "PMI",

      "Powell",

      "Federal Reserve",

      "Fed"

    ];

    // =======================================================
    // US EVENTS
    // =======================================================

    const usEvents =
      events.filter(event => {

        const country =
          String(
            event?.country ||
            ""
          ).toUpperCase();

        return (
          country === "US" ||
          country === "USA" ||
          country === "UNITED STATES"
        );

      });

    // =======================================================
    // IMPORTANT EVENTS
    // =======================================================

    const importantEvents =
      usEvents.filter(event => {

        const name =
          String(
            event?.event ||
            event?.name ||
            ""
          );

        return importantKeywords.some(
          keyword =>
            name
              .toLowerCase()
              .includes(
                keyword.toLowerCase()
              )
        );

      });

    // =======================================================
    // HIGH IMPACT
    // =======================================================

    const highImpactEvents =
      usEvents.filter(event => {

        const impact =
          String(
            event?.impact ||
            event?.importance ||
            ""
          ).toLowerCase();

        return (
          impact.includes("high") ||
          impact.includes("3")
        );

      });

    // =======================================================
    // FORMAT EVENTS
    // =======================================================

    const normalizeEvent =
      event => ({

        date:
          event?.date ||
          null,

        country:
          event?.country ||
          null,

        event:
          event?.event ||
          event?.name ||
          null,

        impact:
          event?.impact ||
          event?.importance ||
          null,

        actual:
          event?.actual ??
          null,

        estimate:
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

      });

    const normalizedAll =
      usEvents.map(
        normalizeEvent
      );

    const normalizedImportant =
      importantEvents.map(
        normalizeEvent
      );

    const normalizedHighImpact =
      highImpactEvents.map(
        normalizeEvent
      );

    // =======================================================
    // FIND CPI
    // =======================================================

    const cpiEvents =
      normalizedImportant.filter(
        event => {

          const name =
            String(
              event.event ||
              ""
            ).toLowerCase();

          return (
            name.includes("cpi") ||
            name.includes(
              "consumer price index"
            )
          );

        }
      );

    // =======================================================
    // FIND NFP
    // =======================================================

    const nfpEvents =
      normalizedImportant.filter(
        event => {

          const name =
            String(
              event.event ||
              ""
            ).toLowerCase();

          return (
            name.includes(
              "non farm"
            ) ||
            name.includes(
              "non-farm"
            ) ||
            name.includes(
              "nonfarm"
            ) ||
            name.includes(
              "payroll"
            ) ||
            name === "nfp"
          );

        }
      );

    // =======================================================
    // FIND FOMC
    // =======================================================

    const fomcEvents =
      normalizedImportant.filter(
        event => {

          const name =
            String(
              event.event ||
              ""
            ).toLowerCase();

          return (
            name.includes("fomc") ||
            name.includes(
              "federal funds"
            ) ||
            name.includes(
              "interest rate"
            )
          );

        }
      );

    // =======================================================
    // FIND PPI
    // =======================================================

    const ppiEvents =
      normalizedImportant.filter(
        event => {

          const name =
            String(
              event.event ||
              ""
            ).toLowerCase();

          return (
            name.includes("ppi") ||
            name.includes(
              "producer price"
            )
          );

        }
      );

    // =======================================================
    // CURRENT DATE
    // =======================================================

    const timestamp =
      new Date().toISOString();

    // =======================================================
    // RESPONSE
    // =======================================================

    return res.status(200).json({

      success: true,

      source:
        "Financial Modeling Prep",

      timestamp,

      range: {
        from: startDate,
        to: endDate
      },

      summary: {

        totalUSEvents:
          normalizedAll.length,

        importantEvents:
          normalizedImportant.length,

        highImpactEvents:
          normalizedHighImpact.length,

        cpi:
          cpiEvents.length,

        nfp:
          nfpEvents.length,

        fomc:
          fomcEvents.length,

        ppi:
          ppiEvents.length

      },

      // -------------------------------------------------------
      // MOST IMPORTANT NEWS
      // -------------------------------------------------------

      importantNews:
        normalizedImportant,

      // -------------------------------------------------------
      // CPI
      // -------------------------------------------------------

      cpi:
        cpiEvents,

      // -------------------------------------------------------
      // NFP
      // -------------------------------------------------------

      nfp:
        nfpEvents,

      // -------------------------------------------------------
      // FOMC
      // -------------------------------------------------------

      fomc:
        fomcEvents,

      // -------------------------------------------------------
      // PPI
      // -------------------------------------------------------

      ppi:
        ppiEvents,

      // -------------------------------------------------------
      // HIGH IMPACT
      // -------------------------------------------------------

      highImpact:
        normalizedHighImpact,

      // -------------------------------------------------------
      // ALL US EVENTS
      // -------------------------------------------------------

      events:
        normalizedAll

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
        error?.message ||
        null

    });

  }

}
