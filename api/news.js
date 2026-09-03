// api/news.js
// ShahanFX AI - Xoomar Economic Calendar
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
    const today = new Date()
      .toISOString()
      .slice(0, 10);

    const from =
      req.query && req.query.from
        ? String(req.query.from)
        : today;

    const to =
      req.query && req.query.to
        ? String(req.query.to)
        : today;

    const url =
      "https://xoomar.com/api/markets/calendar" +
      "?from=" +
      encodeURIComponent(from) +
      "&to=" +
      encodeURIComponent(to) +
      "&importance=high";

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
      data = null;
    }

    if (!response.ok) {
      return res.status(200).json({
        ok: true,
        success: false,
        live: false,
        source: "Xoomar",
        from,
        to,
        count: 0,
        events: [],
        warning: "Xoomar وەڵامی سەرکەوتوو نەدا.",
        status: response.status
      });
    }

    const rawEvents =
      Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];

    const events = rawEvents.map(function (item) {
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
          null
      };
    });

    return res.status(200).json({
      ok: true,
      success: true,
      live: true,
      source: "Xoomar",
      provider: "Xoomar Pulse",
      from,
      to,
      count: events.length,
      events,
      updatedAt:
        data?.updatedAt ||
        new Date().toISOString()
    });

  } catch (error) {
    return res.status(200).json({
      ok: true,
      success: false,
      live: false,
      source: "Xoomar",
      count: 0,
      events: [],
      warning:
        error && error.message
          ? error.message
          : "هەڵەیەکی نەناسراو ڕوویدا."
    });
  }
}
