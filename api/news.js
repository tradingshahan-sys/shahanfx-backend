export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "تەنها GET ڕێگەپێدراوە."
    });
  }

  try {
    const from =
      req.query && req.query.from
        ? String(req.query.from)
        : new Date().toISOString().slice(0, 10);

    const to =
      req.query && req.query.to
        ? String(req.query.to)
        : from;

    const apiKey = process.env.FMP_API_KEY;

    // ئەگەر API Key نەبوو، هەر Function ـەکە نەکوژێنەوە
    if (!apiKey) {
      return res.status(200).json({
        ok: true,
        success: false,
        source: "FMP",
        from,
        to,
        count: 0,
        events: [],
        warning: "FMP_API_KEY دانەنراوە."
      });
    }

    const url =
      "https://financialmodelingprep.com/stable/economic-calendar" +
      "?from=" +
      encodeURIComponent(from) +
      "&to=" +
      encodeURIComponent(to) +
      "&apikey=" +
      encodeURIComponent(apiKey);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = [];
    }

    if (!response.ok) {
      return res.status(200).json({
        ok: true,
        success: false,
        source: "FMP",
        from,
        to,
        count: 0,
        events: [],
        warning: "FMP API وەڵامی دروستی نەدا.",
        status: response.status
      });
    }

    if (!Array.isArray(data)) {
      return res.status(200).json({
        ok: true,
        success: false,
        source: "FMP",
        from,
        to,
        count: 0,
        events: [],
        warning: "FMP داتای Economic Calendar ـی نەگەڕاندەوە."
      });
    }

    const keywords = [
      "cpi",
      "nfp",
      "fomc",
      "fed",
      "ppi",
      "gdp",
      "interest",
      "nonfarm",
      "inflation",
      "unemployment",
      "retail sales",
      "ism",
      "employment",
      "jobs"
    ];

    const events = data
      .filter(function (item) {
        const country = String(
          item.country ||
          item.countryName ||
          ""
        ).toLowerCase();

        const name = String(
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

        const important =
          impact.includes("high") ||
          impact.includes("medium") ||
          keywords.some(function (word) {
            return name.includes(word);
          });

        return isUS && important;
      })
      .slice(0, 50)
      .map(function (item) {
        return {
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
              : null
        };
      });

    return res.status(200).json({
      ok: true,
      success: true,
      source: "FMP",
      from,
      to,
      count: events.length,
      events
    });

  } catch (error) {
    return res.status(200).json({
      ok: true,
      success: false,
      count: 0,
      events: [],
      warning:
        error && error.message
          ? error.message
          : "هەڵەیەکی نەناسراو ڕوویدا."
    });
  }
}
