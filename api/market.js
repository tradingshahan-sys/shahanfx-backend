export default async function handler(req, res) {

  // =========================================================
  // SHAHANFX LIVE MARKET API
  // Twelve Data
  // =========================================================

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  // ---------------------------------------------------------
  // OPTIONS
  // ---------------------------------------------------------

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ---------------------------------------------------------
  // GET / POST
  // ---------------------------------------------------------

  if (
    req.method !== "GET" &&
    req.method !== "POST"
  ) {
    return res.status(405).json({
      success: false,
      error: "تەنها GET یان POST ڕێگەپێدراوە."
    });
  }

  try {

    // =======================================================
    // API KEY
    // =======================================================

    const apiKey =
      process.env.TWELVE_DATA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error:
          "TWELVE_DATA_API_KEY لە Vercel Environment Variables دانەنراوە."
      });
    }

    // =======================================================
    // INPUT
    // =======================================================

    let input = {};

    if (req.method === "GET") {

      input = req.query || {};

    } else {

      input = req.body || {};

    }

    // =======================================================
    // SYMBOL
    // =======================================================

    let symbol =
      input.symbol ||
      "XAU/USD";

    // -------------------------------------------------------
    // Normalize common symbols
    // -------------------------------------------------------

    const symbolMap = {

      "XAUUSD": "XAU/USD",
      "GOLD": "XAU/USD",

      "EURUSD": "EUR/USD",
      "GBPUSD": "GBP/USD",
      "USDJPY": "USD/JPY",
      "USDCHF": "USD/CHF",
      "AUDUSD": "AUD/USD",
      "USDCAD": "USD/CAD",
      "NZDUSD": "NZD/USD"

    };

    if (symbolMap[symbol.toUpperCase()]) {

      symbol =
        symbolMap[symbol.toUpperCase()];

    }

    // =======================================================
    // INTERVAL
    // =======================================================

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

    let interval =
      input.interval ||
      "5min";

    if (
      !allowedIntervals.includes(interval)
    ) {

      interval = "5min";

    }

    // =======================================================
    // OUTPUT SIZE
    // =======================================================

    let outputsize =
      Number(
        input.outputsize || 100
      );

    if (
      !Number.isFinite(outputsize)
    ) {

      outputsize = 100;

    }

    // Keep API request reasonable
    outputsize =
      Math.min(
        Math.max(outputsize, 1),
        500
      );

    // =======================================================
    // TYPE
    // =======================================================

    const type =
      input.type || "time_series";

    // =======================================================
    // BASE URL
    // =======================================================

    const baseURL =
      "https://api.twelvedata.com";

    // =======================================================
    // URL HELPER
    // =======================================================

    function makeURL(
      endpoint,
      parameters = {}
    ) {

      const url =
        new URL(
          `${baseURL}/${endpoint}`
        );

      url.searchParams.set(
        "apikey",
        apiKey
      );

      for (
        const [key, value]
        of Object.entries(parameters)
      ) {

        if (
          value !== undefined &&
          value !== null &&
          value !== ""
        ) {

          url.searchParams.set(
            key,
            String(value)
          );

        }

      }

      return url.toString();

    }

    // =======================================================
    // PRICE
    // =======================================================

    if (type === "price") {

      const url =
        makeURL(
          "price",
          {
            symbol
          }
        );

      const response =
        await fetch(url);

      const data =
        await response.json();

      if (!response.ok) {

        return res.status(
          response.status
        ).json({

          success: false,

          error:
            data?.message ||
            "هەڵە لە Twelve Data."

        });

      }

      if (
        data?.status === "error"
      ) {

        return res.status(400).json({

          success: false,

          error:
            data?.message ||
            "نەتوانرا نرخی بازاڕ بهێنرێت."

        });

      }

      return res.status(200).json({

        success: true,

        source: "Twelve Data",

        type: "price",

        symbol,

        price:
          Number(data?.price),

        raw: data

      });

    }

    // =======================================================
    // QUOTE
    // =======================================================

    if (type === "quote") {

      const url =
        makeURL(
          "quote",
          {
            symbol
          }
        );

      const response =
        await fetch(url);

      const data =
        await response.json();

      if (!response.ok) {

        return res.status(
          response.status
        ).json({

          success: false,

          error:
            data?.message ||
            "هەڵە لە Twelve Data."

        });

      }

      if (
        data?.status === "error"
      ) {

        return res.status(400).json({

          success: false,

          error:
            data?.message ||
            "Quote بەردەست نییە."

        });

      }

      return res.status(200).json({

        success: true,

        source: "Twelve Data",

        type: "quote",

        symbol,

        quote: {

          datetime:
            data?.datetime || null,

          open:
            Number(data?.open),

          high:
            Number(data?.high),

          low:
            Number(data?.low),

          close:
            Number(data?.close),

          previousClose:
            Number(data?.previous_close),

          change:
            Number(data?.change),

          percentChange:
            Number(data?.percent_change)

        },

        raw: data

      });

    }

    // =======================================================
    // TIME SERIES
    // =======================================================

    const url =
      makeURL(
        "time_series",
        {

          symbol,

          interval,

          outputsize,

          order:
            "desc"

        }
      );

    const response =
      await fetch(url);

    const data =
      await response.json();

    // =======================================================
    // API ERROR
    // =======================================================

    if (!response.ok) {

      console.error(
        "Twelve Data HTTP Error:",
        data
      );

      return res.status(
        response.status
      ).json({

        success: false,

        error:
          data?.message ||
          "هەڵەی Twelve Data ڕوویدا."

      });

    }

    if (
      data?.status === "error"
    ) {

      console.error(
        "Twelve Data API Error:",
        data
      );

      return res.status(400).json({

        success: false,

        error:
          data?.message ||
          "داتای بازاڕ بەردەست نییە."

      });

    }

    // =======================================================
    // VALUES
    // =======================================================

    const values =
      Array.isArray(data?.values)
        ? data.values
        : [];

    // =======================================================
    // NORMALIZE CANDLES
    // =======================================================

    const candles =
      values.map(
        candle => ({

          datetime:
            candle?.datetime || null,

          open:
            Number(candle?.open),

          high:
            Number(candle?.high),

          low:
            Number(candle?.low),

          close:
            Number(candle?.close),

          volume:
            candle?.volume !== undefined
              ? Number(candle.volume)
              : null

        })
      );

    // =======================================================
    // CURRENT CANDLE
    // =======================================================

    const current =
      candles[0] || null;

    const previous =
      candles[1] || null;

    // =======================================================
    // BASIC DIRECTION
    // =======================================================

    let direction =
      "neutral";

    if (
      current &&
      previous
    ) {

      if (
        current.close >
        previous.close
      ) {

        direction = "bullish";

      } else if (
        current.close <
        previous.close
      ) {

        direction = "bearish";

      }

    }

    // =======================================================
    // CANDLE INFORMATION
    // =======================================================

    let candleType =
      "neutral";

    if (current) {

      const body =
        Math.abs(
          current.close -
          current.open
        );

      const totalRange =
        current.high -
        current.low;

      if (
        totalRange > 0
      ) {

        const bodyRatio =
          body /
          totalRange;

        if (
          current.close >
          current.open
        ) {

          candleType =
            bodyRatio > 0.6
              ? "strong_bullish"
              : "bullish";

        } else if (
          current.close <
          current.open
        ) {

          candleType =
            bodyRatio > 0.6
              ? "strong_bearish"
              : "bearish";

        }

      }

    }

    // =======================================================
    // RANGE
    // =======================================================

    let range = null;

    if (current) {

      range =
        current.high -
        current.low;

    }

    // =======================================================
    // RESPONSE
    // =======================================================

    return res.status(200).json({

      success: true,

      source:
        "Twelve Data",

      symbol,

      interval,

      timestamp:
        new Date().toISOString(),

      market: {

        currentPrice:
          current?.close ?? null,

        direction,

        candleType,

        currentRange:
          range,

        currentCandle:
          current,

        previousCandle:
          previous

      },

      candles,

      meta:
        data?.meta || null

    });

  }

  // =========================================================
  // SERVER ERROR
  // =========================================================

  catch (error) {

    console.error(
      "ShahanFX Market Error:",
      error
    );

    return res.status(500).json({

      success: false,

      error:
        "هەڵەی ناوخۆی ShahanFX Market API ڕوویدا.",

      details:
        error?.message || null

    });

  }

}
