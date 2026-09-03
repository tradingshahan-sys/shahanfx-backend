// api/news.js
// ShahanFX AI - Xoomar + FMP Economic Calendar
// chat.js دەستکاری ناکرێت

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
    // =========================================================
    // 1. بەرواری ئێستا بە کاتی Iraq / Baghdad
    // =========================================================

    const now = new Date();

    const iraqDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Baghdad",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(now);

    const from =
      req.query && req.query.from
        ? String(req.query.from)
        : iraqDate;

    const to =
      req.query && req.query.to
        ? String(req.query.to)
        : iraqDate;

    // =========================================================
    // 2. XOOMAR
    // =========================================================

    const xoomarUrl =
      "https://xoomar.com/api/markets/calendar" +
      "?from=" +
      encodeURIComponent(from) +
      "&to=" +
      encodeURIComponent(to) +
      "&importance=high";

    let xoomarEvents = [];

    try {
      const response = await fetch(xoomarUrl, {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      });

      const text = await response.text();

      let data = null;

      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (response.ok) {
        const rawEvents =
          Array.isArray(data)
            ? data
            : Array.isArray(data?.data)
              ? data.data
              : [];

        xoomarEvents = rawEvents.map((item) => {
          return {
            date:
              item.scheduledAt ||
              item.datetime ||
              item.date ||
              null,

            country:
              item.country ||
              item.countryName ||
              "United States",

            event:
              item.eventName ||
              item.event ||
              item.name ||
              item.title ||
              "",

            impact:
              item.importance ||
              item.impact ||
              "high",

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

            period:
              item.periodLabel ||
              item.period ||
              null,

            source: "Xoomar"
          };
        });
      }
    } catch {
      xoomarEvents = [];
    }

    // =========================================================
    // 3. FMP
    // =========================================================

    const FMP_API_KEY = process.env.FMP_API_KEY;

    let fmpEvents = [];
    let fmpAvailable = false;

    if (FMP_API_KEY) {
      const fmpUrl =
        "https://financialmodelingprep.com/stable/economic-calendar" +
        "?from=" +
        encodeURIComponent(from) +
        "&to=" +
        encodeURIComponent(to) +
        "&apikey=" +
        encodeURIComponent(FMP_API_KEY);

      try {
        const response = await fetch(fmpUrl, {
          method: "GET",
          headers: {
            Accept: "application/json"
          }
        });

        const text = await response.text();

        let data = null;

        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }

        if (response.ok && Array.isArray(data)) {
          fmpAvailable = true;

          fmpEvents = data.map((item) => {
            return {
              date:
                item.date ||
                item.datetime ||
                item.time ||
                item.releaseDate ||
                null,

              country:
                item.country ||
                item.countryName ||
                "United States",

              event:
                item.event ||
                item.eventName ||
                item.name ||
                item.title ||
                "",

              impact:
                item.importance ||
                item.impact ||
                "high",

              actual:
                item.actual !== undefined
                  ? item.actual
                  : null,

              estimate:
                item.estimate !== undefined
                  ? item.estimate
                  : item.forecast !== undefined
                    ? item.forecast
                    : item.consensus !== undefined
                      ? item.consensus
                      : null,

              previous:
                item.previous !== undefined
                  ? item.previous
                  : item.prior !== undefined
                    ? item.prior
                    : null,

              period:
                item.period ||
                item.periodLabel ||
                null,

              source: "FMP"
            };
          });
        }
      } catch {
        fmpEvents = [];
      }
    }

    // =========================================================
    // 4. یەکخستنی Xoomar + FMP
    // =========================================================

    const allEvents = [
      ...xoomarEvents,
      ...fmpEvents
    ];

    // =========================================================
    // 5. ناسینەوەی NFP / CPI / FOMC
    // =========================================================

    function normalizeEventName(name) {
      return String(name || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
    }

    function eventType(name) {
      const n = normalizeEventName(name);

      if (
        n.includes("nonfarm payroll") ||
        n.includes("non-farm payroll") ||
        n.includes("employment situation")
      ) {
        return "NFP";
      }

      if (
        n.includes("consumer price index") ||
        n.includes("cpi")
      ) {
        return "CPI";
      }

      if (
        n.includes("fomc") ||
        n.includes("federal funds rate") ||
        n.includes("fed interest rate")
      ) {
        return "FOMC";
      }

      return null;
    }

    // =========================================================
    // 6. تەنها هەواڵە گرنگەکان بۆ Gold / Forex
    // =========================================================

    const importantKeywords = [
      "nonfarm payroll",
      "non-farm payroll",
      "employment situation",
      "consumer price index",
      "cpi",
      "fomc",
      "federal funds rate",
      "interest rate decision",
      "unemployment rate",
      "retail sales",
      "pce",
      "core pce",
      "gdp",
      "ism manufacturing",
      "ism services",
      "jobless claims"
    ];

    function isRelevant(event) {
      const name = normalizeEventName(event.event);

      return importantKeywords.some((keyword) =>
        name.includes(keyword)
      );
    }

    const relevantEvents = allEvents.filter(isRelevant);

    // =========================================================
    // 7. Deduplicate
    // =========================================================

    const unique = new Map();

    for (const event of relevantEvents) {
      const type = eventType(event.event);

      const key =
        type ||
        (
          normalizeEventName(event.event) +
          "|" +
          String(event.date || "")
        );

      // FMP پێش Xoomar بۆ داتای value ـەکان
      if (!unique.has(key)) {
        unique.set(key, event);
      } else {
        const old = unique.get(key);

        unique.set(key, {
          ...old,

          actual:
            event.actual !== null
              ? event.actual
              : old.actual,

          estimate:
            event.estimate !== null
              ? event.estimate
              : old.estimate,

          previous:
            event.previous !== null
              ? event.previous
              : old.previous,

          date:
            event.date ||
            old.date,

          country:
            event.country ||
            old.country,

          period:
            event.period ||
            old.period
        });
      }
    }

    const events = Array.from(unique.values()).map((event) => {
      const type = eventType(event.event);

      return {
        ...event,

        type,

        market: "XAU/USD",

        goldImpact:
          type === "NFP"
            ? "high"
            : type === "CPI"
              ? "high"
              : type === "FOMC"
                ? "high"
                : "medium"
      };
    });

    // =========================================================
    // 8. Response
    // =========================================================

    return res.status(200).json({
      ok: true,
      success: true,

      live: true,

      source: "Xoomar + FMP",

      providers: {
        xoomar: xoomarEvents.length > 0,
        fmp: fmpAvailable
      },

      from,
      to,

      count: events.length,

      events,

      updatedAt: now.toISOString()
    });

  } catch (error) {
    return res.status(200).json({
      ok: true,
      success: false,
      live: false,

      source: "Xoomar + FMP",

      count: 0,

      events: [],

      warning:
        error && error.message
          ? error.message
          : "هەڵەیەکی نەناسراو ڕوویدا."
    });
  }
}
