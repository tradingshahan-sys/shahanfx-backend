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

    const apiKey =
      process.env.FMP_API_KEY;

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

    // -------------------------------------------------------
    // Dates
    // -------------------------------------------------------

    const today =
      new Date();

    const startDate =
      input.from ||
      today.toISOString().slice(0, 10);

    const future =
      new Date(today);

    future.setDate(
      future.getDate() + 3
    );

    const endDate =
      input.to ||
      future.toISOString().slice(0, 10);

    // -------------------------------------------------------
    // FMP Economic Calendar
    // -------------------------------------------------------

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

    const response =
      await fetch(
        url.toString()
      );

    const data =
      await response.json();

    if (!response.ok) {

      console.error(
        "FMP HTTP error:",
        data
      );

      return res.status(
        response.status
      ).json({

        success: false,

        error:
          data?.message ||
          "هەڵە لە FMP."

      });

    }

    if (
      data?.error
    ) {

      return res.status(400).json({

        success: false,

        error:
          data.error

      });

    }

    const events =
      Array.isArray(data)
        ? data
        : [];

    // -------------------------------------------------------
    // Forex-focused events
    // -------------------------------------------------------

    const importantKeywords = [

      "CPI",
      "Consumer Price",
      "Non Farm",
      "NFP",
      "Interest Rate",
      "Federal Funds",
      "FOMC",
      "GDP",
      "PPI",
      "Producer Price",
      "Unemployment",
      "Retail Sales",
      "PMI",
      "ISM",
      "Jobless",
      "Employment",
      "Powell"

    ];

    const filtered =
      events.filter(event => {

        const text =
          JSON.stringify(
            event
          ).toLowerCase();

        return importantKeywords.some(
          keyword =>
            text.includes(
              keyword.toLowerCase()
            )
        );

      });

    return res.status(200).json({

      success: true,

      source:
        "Financial Modeling Prep",

      from:
        startDate,

      to:
        endDate,

      count:
        filtered.length,

      events:
        filtered,

      allEventsCount:
        events.length

    });

  } catch (error) {

    console.error(
      "ShahanFX news error:",
      error
    );

    return res.status(500).json({

      success: false,

      error:
        "هەڵەی ناوخۆی News API ڕوویدا."

    });

  }

}
