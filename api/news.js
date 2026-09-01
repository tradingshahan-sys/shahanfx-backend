// api/news.js
// ShahanFX AI — Live Economic News

export default async function handler(req, res) {

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error:
        "تەنها GET ڕێگەپێدراوە."
    });
  }

  const API_KEY =
    process.env.FMP_API_KEY;

  if (!API_KEY) {
    return res.status(503).json({
      ok: false,
      error:
        "FMP API key دانەنراوە."
    });
  }

  try {

    const url =
      "https://financialmodelingprep.com/stable/economic-calendar" +
      `?apikey=${encodeURIComponent(API_KEY)}`;

    const response =
      await fetch(url);

    const data =
      await response.json();

    if (
      !response.ok ||
      !Array.isArray(data)
    ) {
      return res.status(502).json({
        ok: false,
        error:
          "News Data بەردەست نییە."
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
      "ISM"
    ];

    const events =
      data
        .filter(item => {

          const country =
            String(
              item.country || ""
            ).toUpperCase();

          const event =
            String(
              item.event || ""
            ).toUpperCase();

          const impact =
            String(
              item.impact ||
              item.importance ||
              ""
            ).toUpperCase();

          return (
            country === "US" ||
            country === "USA" ||
            keywords.some(k =>
              event.includes(k)
            ) ||
            impact.includes("HIGH") ||
            impact.includes("IMPORTANT")
          );

        })
        .slice(0, 40);

    return res.status(200).json({
      ok: true,
      events
    });

  } catch {

    return res.status(502).json({
      ok: false,
      error:
        "هەڵە لە وەرگرتنی News Data."
    });
  }
}
