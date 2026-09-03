// engine/tradingIntelligence.js
// ============================================================
// ShahanFX AI Pro
// Trading Intelligence Engine
// ============================================================
// Purpose:
// - Combine SMC analysis into one intelligent context
// - Calculate confluence score
// - Determine market bias
// - Evaluate BUY / SELL setup quality
// - Calculate confidence
// - Respect liquidity, FVG, OB, BOS, CHOCH, displacement
// - Respect premium / discount
// - Return WAIT when confirmation is insufficient
//
// Works with:
// utils/smcAnalyzer.js
//
// No external packages required.
// ============================================================

const CONFIG = {
  strongScore: 80,
  goodScore: 65,
  moderateScore: 50,

  minimumSetupScore: 60,
  minimumConfirmationScore: 65,

  weights: {
    marketStructure: 15,
    bos: 15,
    choch: 10,
    liquidity: 15,
    liquiditySweep: 15,
    fvg: 10,
    orderBlock: 10,
    displacement: 10
  },

  penalties: {
    conflict: 10,
    noConfirmation: 8,
    premiumDiscountConflict: 8,
    weakSetup: 10
  }
};

// ============================================================
// Helpers
// ============================================================

function safeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalizeDirection(value) {
  if (!value) return null;

  const text = String(value).trim().toUpperCase();

  if (
    text.includes("BULL") ||
    text.includes("BUY") ||
    text.includes("LONG")
  ) {
    return "BULLISH";
  }

  if (
    text.includes("BEAR") ||
    text.includes("SELL") ||
    text.includes("SHORT")
  ) {
    return "BEARISH";
  }

  if (
    text.includes("NEUTRAL") ||
    text.includes("RANGE") ||
    text.includes("SIDE")
  ) {
    return "NEUTRAL";
  }

  return null;
}

function getLatest(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return items[items.length - 1];
}

function getRecent(items, count = 5) {
  if (!Array.isArray(items)) return [];

  return items.slice(-count);
}

function hasBullish(items) {
  return Array.isArray(items) &&
    items.some(item => {
      const direction =
        normalizeDirection(
          item?.direction ||
          item?.bias ||
          item?.type
        );

      return direction === "BULLISH";
    });
}

function hasBearish(items) {
  return Array.isArray(items) &&
    items.some(item => {
      const direction =
        normalizeDirection(
          item?.direction ||
          item?.bias ||
          item?.type
        );

      return direction === "BEARISH";
    });
}

function getDirectionFromObject(object) {
  if (!object || typeof object !== "object") {
    return null;
  }

  return normalizeDirection(
    object.direction ||
    object.bias ||
    object.trend ||
    object.type
  );
}

// ============================================================
// News Proximity Check (30 Minutes Window)
// ============================================================

function checkNewsProximity(smc, options) {
  const events = Array.isArray(smc?.news)
    ? smc.news
    : Array.isArray(smc?.events)
      ? smc.events
      : Array.isArray(options?.news)
        ? options.news
        : [];

  if (events.length === 0) return { hasNews: false };

  const now = Date.now();

  for (const item of events) {
    if (!item) continue;
    const dateStr = item.scheduledAt || item.datetime || item.date || item.time;
    if (!dateStr) continue;

    const eventTime = new Date(dateStr).getTime();
    if (isNaN(eventTime)) continue;

    const diffMinutes = (eventTime - now) / (1000 * 60);

    // تەنها ئەگەر لە نێوان 0 تا 30 دەقەی داهاتوودا بێت
    if (diffMinutes >= 0 && diffMinutes <= 30) {
      return {
        hasNews: true,
        eventTitle: item.event || item.title || "High Impact News",
        diffMinutes: Math.round(diffMinutes)
      };
    }
  }

  return { hasNews: false };
}

// ============================================================
// Market Structure
// ============================================================

function analyzeMarketStructure(smc) {
  const structure =
    smc?.marketStructure ||
    smc?.structure ||
    null;

  const direction = getDirectionFromObject(structure);

  if (direction) {
    return {
      direction,
      score: CONFIG.weights.marketStructure,
      status: "CONFIRMED",
      source: "marketStructure"
    };
  }

  return {
    direction: "NEUTRAL",
    score: 0,
    status: "UNKNOWN",
    source: "marketStructure"
  };
}

// ============================================================
// BOS
// ============================================================

function analyzeBOS(smc) {
  const bos = Array.isArray(smc?.bos)
    ? smc.bos
    : [];

  const recent = getRecent(bos, 5);

  const bullish = hasBullish(recent);
  const bearish = hasBearish(recent);

  if (bullish && !bearish) {
    return {
      direction: "BULLISH",
      score: CONFIG.weights.bos,
      status: "CONFIRMED",
      count: recent.length
    };
  }

  if (bearish && !bullish) {
    return {
      direction: "BEARISH",
      score: CONFIG.weights.bos,
      status: "CONFIRMED",
      count: recent.length
    };
  }

  if (bullish && bearish) {
    return {
      direction: "NEUTRAL",
      score: 0,
      status: "CONFLICT",
      count: recent.length
    };
  }

  return {
    direction: "NEUTRAL",
    score: 0,
    status: "NONE",
    count: 0
  };
}

// ============================================================
// CHOCH
// ============================================================

function analyzeCHOCH(smc) {
  const choch = Array.isArray(smc?.choch)
    ? smc.choch
    : [];

  const recent = getRecent(choch, 3);
  const latest = getLatest(recent);

  const direction = getDirectionFromObject(latest);

  if (!direction) {
    return {
      direction: "NEUTRAL",
      score: 0,
      status: "NONE"
    };
  }

  return {
    direction,
    score: CONFIG.weights.choch,
    status: "CONFIRMED"
  };
}

// ============================================================
// Liquidity
// ============================================================

function analyzeLiquidity(smc) {
  const liquidity = Array.isArray(smc?.liquidity)
    ? smc.liquidity
    : [];

  const sweeps = Array.isArray(smc?.liquiditySweeps)
    ? smc.liquiditySweeps
    : [];

  const recentLiquidity = getRecent(liquidity, 10);
  const recentSweeps = getRecent(sweeps, 5);

  const bullishSweep = hasBullish(recentSweeps);
  const bearishSweep = hasBearish(recentSweeps);

  let sweepDirection = "NEUTRAL";

  if (bullishSweep && !bearishSweep) {
    sweepDirection = "BULLISH";
  } else if (bearishSweep && !bullishSweep) {
    sweepDirection = "BEARISH";
  }

  return {
    liquidityCount: recentLiquidity.length,

    sweepDirection,

    sweepScore:
      sweepDirection === "NEUTRAL"
        ? 0
        : CONFIG.weights.liquiditySweep,

    liquidityScore:
      recentLiquidity.length > 0
        ? CONFIG.weights.liquidity
        : 0,

    status:
      recentLiquidity.length > 0
        ? "AVAILABLE"
        : "NONE"
  };
}

// ============================================================
// FVG
// ============================================================

function analyzeFVG(smc) {
  const fvgs =
    Array.isArray(smc?.activeFVGs)
      ? smc.activeFVGs
      : Array.isArray(smc?.fvgs)
        ? smc.fvgs
        : [];

  const active = fvgs.filter(fvg => {
    if (!fvg) return false;

    if (
      fvg.mitigated === true ||
      fvg.filled === true
    ) {
      return false;
    }

    return true;
  });

  const bullish = active.filter(fvg =>
    normalizeDirection(fvg?.direction || fvg?.type) === "BULLISH"
  );

  const bearish = active.filter(fvg =>
    normalizeDirection(fvg?.direction || fvg?.type) === "BEARISH"
  );

  let direction = "NEUTRAL";

  if (bullish.length > bearish.length) {
    direction = "BULLISH";
  } else if (bearish.length > bullish.length) {
    direction = "BEARISH";
  }

  return {
    direction,

    activeCount: active.length,

    bullishCount: bullish.length,

    bearishCount: bearish.length,

    score:
      direction === "NEUTRAL"
        ? 0
        : CONFIG.weights.fvg,

    status:
      active.length > 0
        ? "AVAILABLE"
        : "NONE"
  };
}

// ============================================================
// Order Blocks
// ============================================================

function analyzeOrderBlocks(smc) {
  const obs =
    Array.isArray(smc?.activeOBs)
      ? smc.activeOBs
      : Array.isArray(smc?.orderBlocks)
        ? smc.orderBlocks
        : [];

  const active = obs.filter(ob => {
    if (!ob) return false;

    if (
      ob.mitigated === true ||
      ob.invalidated === true
    ) {
      return false;
    }

    return true;
  });

  const bullish = active.filter(ob =>
    normalizeDirection(
      ob?.direction ||
      ob?.type
    ) === "BULLISH"
  );

  const bearish = active.filter(ob =>
    normalizeDirection(
      ob?.direction ||
      ob?.type
    ) === "BEARISH"
  );

  let direction = "NEUTRAL";

  if (bullish.length > bearish.length) {
    direction = "BULLISH";
  } else if (bearish.length > bullish.length) {
    direction = "BEARISH";
  }

  return {
    direction,

    activeCount: active.length,

    bullishCount: bullish.length,

    bearishCount: bearish.length,

    score:
      direction === "NEUTRAL"
        ? 0
        : CONFIG.weights.orderBlock,

    status:
      active.length > 0
        ? "AVAILABLE"
        : "NONE"
  };
}

// ============================================================
// Displacement
// ============================================================

function analyzeDisplacement(smc) {
  const displacement = Array.isArray(smc?.displacement)
    ? smc.displacement
    : [];

  const recent = getRecent(displacement, 5);

  const bullish = hasBullish(recent);
  const bearish = hasBearish(recent);

  if (bullish && !bearish) {
    return {
      direction: "BULLISH",
      score: CONFIG.weights.displacement,
      status: "CONFIRMED"
    };
  }

  if (bearish && !bullish) {
    return {
      direction: "BEARISH",
      score: CONFIG.weights.displacement,
      status: "CONFIRMED"
    };
  }

  return {
    direction: "NEUTRAL",
    score: 0,
    status:
      recent.length > 0
        ? "CONFLICT_OR_WEAK"
        : "NONE"
  };
}

// ============================================================
// Premium / Discount
// ============================================================

function analyzePremiumDiscount(smc) {
  const pd = smc?.premiumDiscount;

  if (!pd || typeof pd !== "object") {
    return {
      zone: "UNKNOWN",
      direction: "NEUTRAL",
      status: "UNKNOWN"
    };
  }

  const zone = String(
    pd.zone ||
    pd.position ||
    pd.status ||
    ""
  ).toUpperCase();

  if (zone.includes("DISCOUNT")) {
    return {
      zone: "DISCOUNT",
      direction: "BULLISH",
      status: "DISCOUNT"
    };
  }

  if (zone.includes("PREMIUM")) {
    return {
      zone: "PREMIUM",
      direction: "BEARISH",
      status: "PREMIUM"
    };
  }

  return {
    zone: "EQUILIBRIUM",
    direction: "NEUTRAL",
    status: "EQUILIBRIUM"
  };
}

// ============================================================
// Direction Voting
// ============================================================

function buildVotes(components) {
  const votes = {
    BULLISH: 0,
    BEARISH: 0,
    NEUTRAL: 0
  };

  for (const component of components) {
    if (!component) continue;

    const direction =
      normalizeDirection(component.direction);

    if (!direction) continue;

    const score =
      safeNumber(component.score, 0);

    if (direction === "BULLISH") {
      votes.BULLISH += score;
    }

    if (direction === "BEARISH") {
      votes.BEARISH += score;
    }

    if (direction === "NEUTRAL") {
      votes.NEUTRAL += score;
    }
  }

  return votes;
}

// ============================================================
// Conflict Detection
// ============================================================

function detectConflict(components) {
  let bullish = 0;
  let bearish = 0;

  for (const component of components) {
    const direction =
      normalizeDirection(component?.direction);

    if (direction === "BULLISH") {
      bullish++;
    }

    if (direction === "BEARISH") {
      bearish++;
    }
  }

  return {
    conflict: bullish > 0 && bearish > 0,
    bullishSignals: bullish,
    bearishSignals: bearish
  };
}

// ============================================================
// Confluence Score
// ============================================================

function calculateConfluenceScore({
  direction,
  components,
  conflict,
  premiumDiscount
}) {
  let score = 0;

  for (const component of components) {
    if (!component) continue;

    const componentDirection =
      normalizeDirection(component.direction);

    if (
      componentDirection === direction
    ) {
      score += safeNumber(
        component.score,
        0
      );
    }
  }

  // Conflict penalty
  if (conflict) {
    score -= CONFIG.penalties.conflict;
  }

  // Premium / Discount logic
  if (
    premiumDiscount &&
    direction === "BULLISH" &&
    premiumDiscount.zone === "PREMIUM"
  ) {
    score -= CONFIG.penalties.premiumDiscountConflict;
  }

  if (
    premiumDiscount &&
    direction === "BEARISH" &&
    premiumDiscount.zone === "DISCOUNT"
  ) {
    score -= CONFIG.penalties.premiumDiscountConflict;
  }

  return clamp(
    Math.round(score)
  );
}

// ============================================================
// Confirmation Engine
// ============================================================

function calculateConfirmation({
  direction,
  bos,
  choch,
  liquidity,
  displacement
}) {
  let score = 0;

  if (
    bos.direction === direction &&
    bos.status === "CONFIRMED"
  ) {
    score += 30;
  }

  if (
    choch.direction === direction &&
    choch.status === "CONFIRMED"
  ) {
    score += 15;
  }

  if (
    liquidity.sweepDirection === direction
  ) {
    score += 30;
  }

  if (
    displacement.direction === direction &&
    displacement.status === "CONFIRMED"
  ) {
    score += 25;
  }

  return clamp(
    Math.round(score)
  );
}

// ============================================================
// Setup Decision
// ============================================================

function buildDecision({
  direction,
  confluenceScore,
  confirmationScore,
  conflict,
  premiumDiscount,
  newsStatus
}) {
  // پشکنینی هەواڵ: ئەگەر لە ماوەی 30 دەقەی داهاتوودا هەواڵ هەبێت
  if (newsStatus && newsStatus.hasNews) {
    return {
      decision: "WAIT",
      setup: "NEWS_WAIT",
      reason: `High-impact news (${newsStatus.eventTitle}) is coming up in ${newsStatus.diffMinutes} minutes.`
    };
  }

  if (
    direction === "NEUTRAL"
  ) {
    return {
      decision: "WAIT",
      setup: "NO_CLEAR_SETUP",
      reason: "No clear directional bias."
    };
  }

  if (conflict) {
    return {
      decision: "WAIT",
      setup: "CONFLICTING_SETUP",
      reason: "Bullish and bearish signals are conflicting."
    };
  }

  if (
    confluenceScore <
    CONFIG.minimumSetupScore
  ) {
    return {
      decision: "WAIT",
      setup: "WEAK_SETUP",
      reason: "Confluence is not strong enough."
    };
  }

  if (
    confirmationScore <
    CONFIG.minimumConfirmationScore
  ) {
    return {
      decision: "WAIT",
      setup:
        direction === "BULLISH"
          ? "BUY_WATCH"
          : "SELL_WATCH",
      reason: "Confirmation is insufficient."
    };
  }

  if (
    direction === "BULLISH" &&
    premiumDiscount?.zone === "PREMIUM"
  ) {
    return {
      decision: "WAIT",
      setup: "BUY_WATCH",
      reason: "Bullish bias is inside premium."
    };
  }

  if (
    direction === "BEARISH" &&
    premiumDiscount?.zone === "DISCOUNT"
  ) {
    return {
      decision: "WAIT",
      setup: "SELL_WATCH",
      reason: "Bearish bias is inside discount."
    };
  }

  return {
    decision:
      direction === "BULLISH"
        ? "BUY"
        : "SELL",

    setup:
      direction === "BULLISH"
        ? "BUY_SETUP"
        : "SELL_SETUP",

    reason:
      "Confluence and confirmation are aligned."
  };
}

// ============================================================
// Confidence
// ============================================================

function calculateConfidence({
  confluenceScore,
  confirmationScore,
  conflict,
  decision
}) {
  let confidence =
    (confluenceScore * 0.6) +
    (confirmationScore * 0.4);

  if (conflict) {
    confidence -= 15;
  }

  if (decision === "WAIT") {
    confidence -= 10;
  }

  return clamp(
    Math.round(confidence)
  );
}

// ============================================================
// Score Label
// ============================================================

function getScoreLabel(score) {
  if (score >= CONFIG.strongScore) {
    return "STRONG";
  }

  if (score >= CONFIG.goodScore) {
    return "GOOD";
  }

  if (score >= CONFIG.moderateScore) {
    return "MODERATE";
  }

  return "WEAK";
}

// ============================================================
// Main Intelligence Engine
// ============================================================

function analyzeTradingIntelligence(smc, options = {}) {
  if (
    !smc ||
    typeof smc !== "object"
  ) {
    return {
      available: false,

      engine: "ShahanFX Trading Intelligence",

      version: "1.0.0",

      decision: "WAIT",

      bias: "NEUTRAL",

      confidence: 0,

      confluenceScore: 0,

      confirmationScore: 0,

      setup: "NO_DATA",

      reason: "SMC data is unavailable."
    };
  }

  const structure =
    analyzeMarketStructure(smc);

  const bos =
    analyzeBOS(smc);

  const choch =
    analyzeCHOCH(smc);

  const liquidity =
    analyzeLiquidity(smc);

  const fvg =
    analyzeFVG(smc);

  const orderBlock =
    analyzeOrderBlocks(smc);

  const displacement =
    analyzeDisplacement(smc);

  const premiumDiscount =
    analyzePremiumDiscount(smc);

  // پشکنینی کاتی هەواڵ (30 دەقەی پێش ڕووداو)
  const newsStatus = checkNewsProximity(smc, options);

  const components = [
    structure,
    bos,
    choch,
    liquidity,
    {
      direction:
        liquidity.sweepDirection,

      score:
        liquidity.sweepScore
    },
    fvg,
    orderBlock,
    displacement
  ];

  const votes =
    buildVotes(components);

  let direction = "NEUTRAL";

  if (
    votes.BULLISH >
      votes.BEARISH
  ) {
    direction = "BULLISH";
  }

  if (
    votes.BEARISH >
      votes.BULLISH
  ) {
    direction = "BEARISH";
  }

  const conflict =
    detectConflict(components);

  const confluenceScore =
    calculateConfluenceScore({
      direction,
      components,
      conflict: conflict.conflict,
      premiumDiscount
    });

  const confirmationScore =
    calculateConfirmation({
      direction,
      bos,
      choch,
      liquidity,
      displacement
    });

  const decisionData =
    buildDecision({
      direction,
      confluenceScore,
      confirmationScore,
      conflict: conflict.conflict,
      premiumDiscount,
      newsStatus
    });

  const confidence =
    calculateConfidence({
      confluenceScore,
      confirmationScore,
      conflict: conflict.conflict,
      decision:
        decisionData.decision
    });

  const finalScore =
    clamp(
      Math.round(
        (confluenceScore * 0.65) +
        (confirmationScore * 0.35)
      )
    );

  return {
    available: true,

    engine:
      "ShahanFX Trading Intelligence",

    version:
      "1.0.0",

    timestamp:
      new Date().toISOString(),

    bias: direction,

    decision:
      decisionData.decision,

    setup:
      decisionData.setup,

    reason:
      decisionData.reason,

    score: finalScore,

    scoreLabel:
      getScoreLabel(finalScore),

    confluenceScore,

    confirmationScore,

    confidence,

    votes,

    conflict,

    marketStructure: structure,

    BOS: bos,

    CHOCH: choch,

    liquidity,

    FVG: fvg,

    orderBlock,

    displacement,

    premiumDiscount,

    newsStatus, // زیادکردنی باری هەواڵ بۆ ئاگاداری

    confirmation: {
      required:
        decisionData.decision === "WAIT",

      status:
        confirmationScore >=
        CONFIG.minimumConfirmationScore
          ? "SUFFICIENT"
          : "INSUFFICIENT"
    },

    intelligence: {
      bullishEvidence:
        components.filter(
          item =>
            normalizeDirection(
              item?.direction
            ) === "BULLISH"
        ).length,

      bearishEvidence:
        components.filter(
          item =>
            normalizeDirection(
              item?.direction
            ) === "BEARISH"
        ).length,

      neutralEvidence:
        components.filter(
          item =>
            normalizeDirection(
              item?.direction
            ) === "NEUTRAL"
        ).length
    },

    metadata: {
      symbol:
        options.symbol || null,

      timeframe:
        options.interval || null,

      currentPrice:
        safeNumber(
          options.currentPrice,
          null
        )
    }
  };
}

// ============================================================
// AI Context Builder
// ============================================================
// This converts the intelligence result into a compact object
// that can be safely added to the Gemini/OpenRouter prompt.

function buildAITradingContext(intelligence) {
  if (
    !intelligence ||
    intelligence.available === false
  ) {
    return {
      available: false,

      message:
        "Trading Intelligence data is unavailable."
    };
  }

  return {
    available: true,

    engine:
      intelligence.engine,

    bias:
      intelligence.bias,

    decision:
      intelligence.decision,

    setup:
      intelligence.setup,

    score:
      intelligence.score,

    scoreLabel:
      intelligence.scoreLabel,

    confidence:
      intelligence.confidence,

    confluenceScore:
      intelligence.confluenceScore,

    confirmationScore:
      intelligence.confirmationScore,

    reason:
      intelligence.reason,

    marketStructure:
      intelligence.marketStructure,

    BOS:
      intelligence.BOS,

    CHOCH:
      intelligence.CHOCH,

    liquidity:
      intelligence.liquidity,

    FVG:
      intelligence.FVG,

    orderBlock:
      intelligence.orderBlock,

    displacement:
      intelligence.displacement,

    premiumDiscount:
      intelligence.premiumDiscount,

    newsStatus:
      intelligence.newsStatus,

    confirmation:
      intelligence.confirmation
  };
}

// ============================================================
// Export
// ============================================================

export {
  analyzeTradingIntelligence,
  buildAITradingContext
};

export default analyzeTradingIntelligence;
