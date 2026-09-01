// api/news.js
// ShahanFX AI — Live Economic News Diagnostic

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
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

  const API_KEY = process.env.FMP_API_KEY;

  if (!API_KEY) {
    return res.status(503).json({
      ok: false,
      error: "FMP_API_KEY لە Environment Variables نەدۆزرایەوە."
    });
  }

  try {
    const url =
      "https://financialmodelingprep.com/stable/economic-calendar" +
      "?from=2026-09-01" +
      "&to=2026-09-08" +
      `&apikey=${encodeURIComponent(API_KEY)}`;

    const response = await fetch(url);

    const raw = await response.text();

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        source: "FMP",
        status: response.status,
        error:
          data?.Error Message ||
          data?.message ||
          data?.error ||
          raw.slice(0, 500)
      });
    }

    if (!Array.isArray(data)) {
      return res.status(502).json({
        ok: false,
        source: "FMP",
        status: response.status,
        error: "FMP وەڵامێکی Array نەداوە.",
        response:
          typeof data === "object"
            ? data
            : raw.slice(0, 500)
      });
    }

    const keywords = [
      "CPI",
      "NFP",
      "FOMC",
      "FED",
      "PPI",
      "GDP",
      "INTEREST RATE",
      "NONFARM",
      "INFLATION",
      "UNEMPLOYMENT",
      "RETAIL SALES",
      "ISM",
      "JOBLESS",
      "PAYROLL",
      "PMI"
    ];

    const events = data
      .filter((item) => {
        const country = String(
          item.country || ""
        ).toUpperCase();

        const event = String(
          item.event || ""
        ).toUpperCase();

        const impact = String(
          item.impact ||
          item.importance ||
          ""
        ).toUpperCase();

        return (
          country === "US" ||
          country === "USA" ||
          keywords.some((keyword) =>
            event.includes(keyword)
          ) ||
          impact.includes("HIGH") ||
          impact.includes("IMPORTANT")
        );
      })
      .slice(0, 40);

    return res.status(200).json({
      ok: true,
      source: "FMP",
      live: true,
      total: data.length,
      filtered: events.length,
      events
    });

  } catch (error) {
    console.error("FMP NEWS ERROR:", error);

    return res.status(502).json({
      ok: false,
      source: "FMP",
      error:
        error?.message ||
        "هەڵەی نەناسراو لە FMP."
    });
  }
}
