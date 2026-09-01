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
    const apiKey = process.env.TWELVE_DATA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "TWELVE_DATA_API_KEY لە Vercel دانەنراوە."
      });
    }

    const input = req.method === "GET"
      ? (req.query || {})
      : (req.body || {});

    let symbol = input.symbol || "XAU/USD";
    const interval = input.interval || "5min";

    const symbolMap = {
      XAUUSD: "XAU/USD",
      GOLD: "XAU/USD",
      EURUSD: "EUR/USD",
      GBPUSD: "GBP/USD",
      USDJPY: "USD/JPY",
      USDCHF: "USD/CHF",
      AUDUSD: "AUD/USD",
      USDCAD: "USD/CAD",
      NZDUSD: "NZD/USD"
    };

    const mapped = symbolMap[String(symbol).toUpperCase()];
    if (mapped) symbol = mapped;

    const allowedIntervals = [
      "1min",
      "5min",
      "15min",
      "30min",
      "45min",
      "1h",
      "2h",
      "4h",
      "8h",
      "1day"
    ];

    const safeInterval = allowedIntervals.includes(interval)
      ? interval
      : "5min";

    let outputsize = Number(input.outputsize || 100);

    if (!Number.isFinite(outputsize)) outputsize = 100;

    outputsize = Math.min(Math.max(outputsize, 1), 500);

    const url = new URL(
      "https://api.twelvedata.com/time_series"
    );

    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", safeInterval);
    url.searchParams.set("outputsize", String(outputsize));
    url.searchParams.set("order", "desc");
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok || data?.status === "error") {
      console.error("Twelve Data error:", data);

      return res.status(response.ok ? 400 : response.status).json({
        success: false,
        error: data?.message || "نەتوانرا داتای بازاڕ بهێنرێت."
      });
    }

    const values = Array.isArray(data?.values)
      ? data.values
      : [];

    const candles = values.map(c => ({
      datetime: c.datetime || null,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: c.volume !== undefined ? Number(c.volume) : null
    }));

    const current = candles[0] || null;
    const previous = candles[1] || null;

    let direction = "neutral";

    if (current && previous) {
      if (current.close > previous.close) {
        direction = "bullish";
      } else if (current.close < previous.close) {
        direction = "bearish";
      }
    }

    return res.status(200).json({
      success: true,
      source: "Twelve Data",
      symbol,
      interval: safeInterval,
      timestamp: new Date().toISOString(),

      market: {
        currentPrice: current?.close ?? null,
        direction,
        currentCandle: current,
        previousCandle: previous
      },

      candles,
      meta: data?.meta || null
    });

  } catch (error) {
    console.error("ShahanFX market error:", error);

    return res.status(500).json({
      success: false,
      error: "هەڵەی ناوخۆی Market API ڕوویدا."
    });
  }
}
