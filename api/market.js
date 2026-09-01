// api/market.js
// ShahanFX AI — Live Market Data

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "تەنها GET ڕێگەپێدراوە."
    });
  }

  const API_KEY =
    process.env.TWELVE_DATA_API_KEY;

  if (!API_KEY) {
    return res.status(503).json({
      ok: false,
      error:
        "Twelve Data API key دانەنراوە."
    });
  }

  const symbol =
    req.query?.symbol ||
    "XAU/USD";

  const interval =
    req.query?.interval ||
    "5min";

  try {
    const url =
      "https://api.twelvedata.com/time_series" +
      `?symbol=${encodeURIComponent(symbol)}` +
      `&interval=${encodeURIComponent(interval)}` +
      "&outputsize=120" +
      `&apikey=${encodeURIComponent(API_KEY)}`;

    const response =
      await fetch(url);

    const data =
      await response.json();

    if (
      !response.ok ||
      data.status === "error"
    ) {
      return res.status(502).json({
        ok: false,
        error:
          "Market Data بەردەست نییە."
      });
    }

    return res.status(200).json({
      ok: true,
      symbol,
      interval,
      values:
        data.values || []
    });

  } catch (error) {

    return res.status(502).json({
      ok: false,
      error:
        "هەڵە لە وەرگرتنی Market Data."
    });
  }
}
