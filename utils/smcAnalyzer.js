// utils/smcAnalyzer.js
// ============================================================
// ShahanFX AI — Smart Money Concepts Analysis Engine
// FVG • Order Blocks • Liquidity • BOS • CHOCH
// Displacement • Confluence Score
// ============================================================

"use strict";

// ============================================================
// CONFIG
// ============================================================

const CONFIG = {
    swingLookback: 2,

    // Minimum candles required for meaningful analysis
    minCandles: 10,

    // FVG
    minFVGPercent: 0.005,
    maxFVGs: 20,

    // Order Block
    obImpulseMultiplier: 1.1,
    obLookForward: 12,
    maxOrderBlocks: 20,

    // Displacement
    displacementMultiplier: 1.1,
    displacementLookback: 10,

    // Liquidity
    liquidityTolerancePercent: 0.15,
    liquidityLookback: 50,

    // Scoring
    strongScore: 70,
    goodScore: 50,
    moderateScore: 35
};

// ============================================================
// HELPERS
// ============================================================

function isValidNumber(value) {
    return Number.isFinite(Number(value));
}

function normalizeCandle(candle, index) {
    if (!candle) return null;

    const open = Number(candle.open ?? candle.OPEN ?? candle.Open);
    const high = Number(candle.high ?? candle.HIGH ?? candle.High);
    const low = Number(candle.low ?? candle.LOW ?? candle.Low);
    const close = Number(candle.close ?? candle.CLOSE ?? candle.Close);

    if (
        !isValidNumber(open) ||
        !isValidNumber(high) ||
        !isValidNumber(low) ||
        !isValidNumber(close)
    ) {
        return null;
    }

    if (high < low) return null;

    return {
        ...candle,
        index,
        open,
        high,
        low,
        close,

        bodySize: Math.abs(close - open),
        range: Math.max(high - low, 0),
        upperWick: Math.max(high - Math.max(open, close), 0),
        lowerWick: Math.max(Math.min(open, close) - low, 0),

        bullish: close > open,
        bearish: close < open,
        neutral: close === open
    };
}

function normalizeCandles(candles) {
    if (!Array.isArray(candles)) return [];

    return candles
        .map((candle, index) => normalizeCandle(candle, index))
        .filter(Boolean);
}

function average(values) {
    const valid = values.filter(Number.isFinite);

    if (!valid.length) return 0;

    return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function getAverageBody(candles, index, lookback = 10) {
    const start = Math.max(0, index - lookback);
    const bodies = [];

    for (let i = start; i < index; i++) {
        if (candles[i]) {
            bodies.push(candles[i].bodySize);
        }
    }

    return average(bodies);
}

function percentageDifference(a, b) {
    const base = Math.max(Math.abs(a), Math.abs(b), 0.00000001);
    return Math.abs(a - b) / base * 100;
}

function scoreLabel(score) {
    if (score >= CONFIG.strongScore) return "STRONG";
    if (score >= CONFIG.goodScore) return "GOOD";
    if (score >= CONFIG.moderateScore) return "MODERATE";
    return "WEAK";
}

function directionFromCandle(candle) {
    if (!candle) return "NEUTRAL";
    if (candle.close > candle.open) return "BULLISH";
    if (candle.close < candle.open) return "BEARISH";
    return "NEUTRAL";
}

// ============================================================
// SWING DETECTION
// ============================================================

function detectSwingPoints(candles, lookback = CONFIG.swingLookback) {
    const swings = [];

    if (candles.length < lookback * 2 + 1) {
        return swings;
    }

    for (let i = lookback; i < candles.length - lookback; i++) {
        const current = candles[i];

        let swingHigh = true;
        let swingLow = true;

        for (let j = 1; j <= lookback; j++) {
            if (
                current.high <= candles[i - j].high ||
                current.high <= candles[i + j].high
            ) {
                swingHigh = false;
            }

            if (
                current.low >= candles[i - j].low ||
                current.low >= candles[i + j].low
            ) {
                swingLow = false;
            }
        }

        if (swingHigh) {
            swings.push({
                type: "SWING_HIGH",
                index: i,
                price: current.high
            });
        }

        if (swingLow) {
            swings.push({
                type: "SWING_LOW",
                index: i,
                price: current.low
            });
        }
    }

    return swings;
}

// ============================================================
// MARKET STRUCTURE
// ============================================================

function detectMarketStructure(candles) {
    const swings = detectSwingPoints(candles);

    const highs = swings
        .filter(s => s.type === "SWING_HIGH")
        .sort((a, b) => a.index - b.index);

    const lows = swings
        .filter(s => s.type === "SWING_LOW")
        .sort((a, b) => a.index - b.index);

    let trend = "BULLISH";

    const lastHigh = highs[highs.length - 1];
    const previousHigh = highs[highs.length - 2];

    const lastLow = lows[lows.length - 1];
    const previousLow = lows[lows.length - 2];

    if (
        lastHigh &&
        previousHigh &&
        lastLow &&
        previousLow
    ) {
        const higherHigh = lastHigh.price > previousHigh.price;
        const higherLow = lastLow.price > previousLow.price;

        const lowerHigh = lastHigh.price < previousHigh.price;
        const lowerLow = lastLow.price < previousLow.price;

        if (higherHigh && higherLow) {
            trend = "BULLISH";
        } else if (lowerHigh && lowerLow) {
            trend = "BEARISH";
        }
    }

    return {
        trend,
        swings,
        highs,
        lows,
        lastHigh,
        previousHigh,
        lastLow,
        previousLow
    };
}

// ============================================================
// BOS
// ============================================================

function detectBOS(candles, structure) {
    const results = [];

    if (!candles.length) return results;

    for (let i = 0; i < candles.length; i++) {
        const candle = candles[i];

        const previousHighs = structure.highs.filter(
            swing => swing.index < i
        );

        const previousLows = structure.lows.filter(
            swing => swing.index < i
        );

        const lastHigh = previousHighs[previousHighs.length - 1];
        const lastLow = previousLows[previousLows.length - 1];

        if (lastHigh && candle.close > lastHigh.price) {
            results.push({
                type: "BULLISH_BOS",
                index: i,
                price: candle.close,
                brokenLevel: lastHigh.price,
                strength: calculateBreakStrength(
                    candle.close,
                    lastHigh.price,
                    candle.range
                )
            });
        }

        if (lastLow && candle.close < lastLow.price) {
            results.push({
                type: "BEARISH_BOS",
                index: i,
                price: candle.close,
                brokenLevel: lastLow.price,
                strength: calculateBreakStrength(
                    lastLow.price,
                    candle.close,
                    candle.range
                )
            });
        }
    }

    return removeDuplicateStructureEvents(results);
}

// ============================================================
// CHOCH
// ============================================================

function detectCHOCH(candles, structure) {
    const results = [];

    const bos = detectBOS(candles, structure);

    for (const event of bos) {
        const beforeCandles = candles.slice(
            0,
            Math.max(0, event.index)
        );

        if (beforeCandles.length < 5) continue;

        const previousStructure = detectMarketStructure(beforeCandles);

        if (
            previousStructure.trend === "BEARISH" &&
            event.type === "BULLISH_BOS"
        ) {
            results.push({
                type: "BULLISH_CHOCH",
                index: event.index,
                price: event.price,
                brokenLevel: event.brokenLevel,
                strength: event.strength
            });
        }

        if (
            previousStructure.trend === "BULLISH" &&
            event.type === "BEARISH_BOS"
        ) {
            results.push({
                type: "BEARISH_CHOCH",
                index: event.index,
                price: event.price,
                brokenLevel: event.brokenLevel,
                strength: event.strength
            });
        }
    }

    return removeDuplicateStructureEvents(results);
}

function calculateBreakStrength(close, level, range) {
    if (!range || range <= 0) return 0;

    return Math.min(
        100,
        Math.max(
            0,
            Math.round(
                (Math.abs(close - level) / range) * 100
            )
        )
    );
}

function removeDuplicateStructureEvents(events) {
    const map = new Map();

    for (const event of events) {
        const key = `${event.type}-${event.index}`;

        if (!map.has(key)) {
            map.set(key, event);
        }
    }

    return Array.from(map.values());
}

// ============================================================
// DISPLACEMENT
// ============================================================

function detectDisplacement(candles) {
    const results = [];

    for (let i = 1; i < candles.length; i++) {
        const candle = candles[i];

        const averageBody = getAverageBody(
            candles,
            i,
            CONFIG.displacementLookback
        );

        if (!averageBody || averageBody <= 0) continue;

        const bodyRatio = candle.bodySize / averageBody;

        const bodyPercentage =
            candle.range > 0
                ? candle.bodySize / candle.range
                : 0;

        const strongBody =
            bodyRatio >= CONFIG.displacementMultiplier;

        const strongClose =
            bodyPercentage >= 0.45;

        if (strongBody && strongClose) {
            results.push({
                type:
                    candle.bullish
                        ? "BULLISH_DISPLACEMENT"
                        : "BEARISH_DISPLACEMENT",

                index: i,

                direction:
                    candle.bullish
                        ? "BULLISH"
                        : "BEARISH",

                bodySize: candle.bodySize,
                averageBody,
                bodyRatio: Number(bodyRatio.toFixed(2)),

                strength: Math.min(
                    100,
                    Math.round(
                        bodyRatio * 40 +
                        bodyPercentage * 60
                    )
                )
            });
        }
    }

    return results;
}

// ============================================================
// LIQUIDITY
// ============================================================

function detectLiquidity(candles) {
    const structure = detectMarketStructure(candles);

    const liquidity = [];

    const highs = structure.highs;
    const lows = structure.lows;

    // Equal High / Buy-side liquidity
    for (let i = 0; i < highs.length; i++) {
        for (let j = i + 1; j < highs.length; j++) {
            const a = highs[i];
            const b = highs[j];

            const difference = percentageDifference(
                a.price,
                b.price
            );

            if (
                difference <=
                CONFIG.liquidityTolerancePercent
            ) {
                liquidity.push({
                    type: "BUY_SIDE_LIQUIDITY",
                    subtype: "EQUAL_HIGH",
                    price: average([a.price, b.price]),
                    firstIndex: a.index,
                    secondIndex: b.index,
                    strength: 75
                });
            }
        }
    }

    // Equal Low / Sell-side liquidity
    for (let i = 0; i < lows.length; i++) {
        for (let j = i + 1; j < lows.length; j++) {
            const a = lows[i];
            const b = lows[j];

            const difference = percentageDifference(
                a.price,
                b.price
            );

            if (
                difference <=
                CONFIG.liquidityTolerancePercent
            ) {
                liquidity.push({
                    type: "SELL_SIDE_LIQUIDITY",
                    subtype: "EQUAL_LOW",
                    price: average([a.price, b.price]),
                    firstIndex: a.index,
                    secondIndex: b.index,
                    strength: 75
                });
            }
        }
    }

    // Previous major highs/lows
    if (structure.lastHigh) {
        liquidity.push({
            type: "BUY_SIDE_LIQUIDITY",
            subtype: "PREVIOUS_HIGH",
            price: structure.lastHigh.price,
            index: structure.lastHigh.index,
            strength: 65
        });
    }

    if (structure.lastLow) {
        liquidity.push({
            type: "SELL_SIDE_LIQUIDITY",
            subtype: "PREVIOUS_LOW",
            price: structure.lastLow.price,
            index: structure.lastLow.index,
            strength: 65
        });
    }

    return deduplicateLiquidity(liquidity);
}

function deduplicateLiquidity(items) {
    const result = [];
    const seen = new Set();

    for (const item of items) {
        const key =
            `${item.type}-${item.subtype}-${Number(item.price).toFixed(5)}`;

        if (!seen.has(key)) {
            seen.add(key);
            result.push(item);
        }
    }

    return result;
}

// ============================================================
// LIQUIDITY SWEEP
// ============================================================

function detectLiquiditySweeps(candles, liquidity) {
    const sweeps = [];

    for (let i = 0; i < candles.length; i++) {
        const candle = candles[i];

        for (const level of liquidity) {
            if (
                level.index !== undefined &&
                i <= level.index
            ) {
                continue;
            }

            // Buy-side sweep:
            // Price trades above liquidity then closes below it.
            if (
                level.type === "BUY_SIDE_LIQUIDITY" &&
                candle.high > level.price &&
                candle.close < level.price
            ) {
                sweeps.push({
                    type: "BUY_SIDE_SWEEP",
                    index: i,
                    price: level.price,
                    sweepHigh: candle.high,
                    direction: "BEARISH",
                    strength: calculateSweepStrength(
                        candle.high,
                        level.price,
                        candle
                    )
                });
            }

            // Sell-side sweep:
            // Price trades below liquidity then closes above it.
            if (
                level.type === "SELL_SIDE_LIQUIDITY" &&
                candle.low < level.price &&
                candle.close > level.price
            ) {
                sweeps.push({
                    type: "SELL_SIDE_SWEEP",
                    index: i,
                    price: level.price,
                    sweepLow: candle.low,
                    direction: "BULLISH",
                    strength: calculateSweepStrength(
                        level.price,
                        candle.low,
                        candle
                    )
                });
            }
        }
    }

    return removeDuplicateSweeps(sweeps);
}

function calculateSweepStrength(extreme, level, candle) {
    if (!candle.range) return 0;

    return Math.min(
        100,
        Math.round(
            Math.abs(extreme - level) /
            candle.range *
            100
        )
    );
}

function removeDuplicateSweeps(sweeps) {
    const map = new Map();

    for (const sweep of sweeps) {
        const key =
            `${sweep.type}-${sweep.index}-${Number(sweep.price).toFixed(5)}`;

        if (!map.has(key)) {
            map.set(key, sweep);
        }
    }

    return Array.from(map.values());
}

// ============================================================
// FAIR VALUE GAPS
// ============================================================

function detectFairValueGaps(candles) {
    const fvgs = [];

    for (let i = 0; i < candles.length - 2; i++) {
        const c1 = candles[i];
        const c2 = candles[i + 1];
        const c3 = candles[i + 2];

        // ----------------------------------------------------
        // Bullish FVG
        // c3.low > c1.high
        // ----------------------------------------------------

        if (
            c3.low > c1.high
        ) {
            const bottom = c1.high;
            const top = c3.low;
            const size = top - bottom;

            const referencePrice =
                Math.max(c1.close, c2.close, c3.close);

            const minimumSize =
                referencePrice *
                (CONFIG.minFVGPercent / 100);

            if (size >= minimumSize) {
                fvgs.push({
                    type: "BULLISH_FVG",
                    top,
                    bottom,
                    midpoint: (top + bottom) / 2,
                    size,
                    index: i + 1,
                    direction: "BULLISH"
                });
            }
        }

        // ----------------------------------------------------
        // Bearish FVG
        // c3.high < c1.low
        // ----------------------------------------------------

        if (
            c3.high < c1.low
        ) {
            const top = c1.low;
            const bottom = c3.high;
            const size = top - bottom;

            const referencePrice =
                Math.min(c1.close, c2.close, c3.close);

            const minimumSize =
                Math.abs(referencePrice) *
                (CONFIG.minFVGPercent / 100);

            if (size >= minimumSize) {
                fvgs.push({
                    type: "BEARISH_FVG",
                    top,
                    bottom,
                    midpoint: (top + bottom) / 2,
                    size,
                    index: i + 1,
                    direction: "BEARISH"
                });
            }
        }
    }

    return fvgs
        .map((fvg, index) => ({
            ...fvg,
            id: `FVG-${index + 1}`
        }))
        .slice(-CONFIG.maxFVGs);
}

// ============================================================
// FVG MITIGATION
// ============================================================

function markFVGMitigation(fvgs, candles) {
    return fvgs.map(fvg => {
        let mitigated = false;
        let filledPercent = 0;

        for (
            let i = fvg.index + 2;
            i < candles.length;
            i++
        ) {
            const candle = candles[i];

            if (fvg.direction === "BULLISH") {
                if (candle.low <= fvg.bottom) {
                    mitigated = true;
                    filledPercent = 100;
                    break;
                }

                if (
                    candle.low < fvg.top &&
                    candle.low > fvg.bottom
                ) {
                    const filled =
                        fvg.top - candle.low;

                    filledPercent = Math.min(
                        100,
                        Math.round(
                            filled /
                            fvg.size *
                            100
                        )
                    );
                }
            }

            if (fvg.direction === "BEARISH") {
                if (candle.high >= fvg.top) {
                    mitigated = true;
                    filledPercent = 100;
                    break;
                }

                if (
                    candle.high > fvg.bottom &&
                    candle.high < fvg.top
                ) {
                    const filled =
                        candle.high - fvg.bottom;

                    filledPercent = Math.min(
                        100,
                        Math.round(
                            filled /
                            fvg.size *
                            100
                        )
                    );
                }
            }
        }

        return {
            ...fvg,
            mitigated,
            filledPercent
        };
    });
}

// ============================================================
// ORDER BLOCKS
// ============================================================

function detectOrderBlocks(candles) {
    const orderBlocks = [];
    const displacement = detectDisplacement(candles);

    for (const impulse of displacement) {
        const impulseIndex = impulse.index;

        let obIndex = -1;

        // Search backwards for the last opposite candle.
        for (
            let j = impulseIndex - 1;
            j >= Math.max(
                0,
                impulseIndex - CONFIG.obLookForward
            );
            j--
        ) {
            const candidate = candles[j];

            if (
                impulse.direction === "BULLISH" &&
                candidate.bearish
            ) {
                obIndex = j;
                break;
            }

            if (
                impulse.direction === "BEARISH" &&
                candidate.bullish
            ) {
                obIndex = j;
                break;
            }
        }

        if (obIndex === -1) continue;

        const obCandle = candles[obIndex];

        const score = calculateOrderBlockScore(
            candles,
            obIndex,
            impulse
        );

        orderBlocks.push({
            type:
                impulse.direction === "BULLISH"
                    ? "BULLISH_OB"
                    : "BEARISH_OB",

            direction: impulse.direction,

            index: obIndex,

            impulseIndex,

            high: obCandle.high,
            low: obCandle.low,

            midpoint:
                (obCandle.high + obCandle.low) / 2,

            score,
            strength: scoreLabel(score),

            displacementConfirmed: true
        });
    }

    return deduplicateOrderBlocks(orderBlocks)
        .sort((a, b) => b.score - a.score)
        .slice(0, CONFIG.maxOrderBlocks);
}

function calculateOrderBlockScore(
    candles,
    obIndex,
    impulse
) {
    let score = 40;

    const ob = candles[obIndex];

    const averageBody =
        getAverageBody(
            candles,
            impulse.index,
            CONFIG.displacementLookback
        );

    if (
        averageBody > 0 &&
        candles[impulse.index].bodySize >
        averageBody * 1.5
    ) {
        score += 20;
    }

    if (ob.bodySize > 0) {
        score += 10;
    }

    const impulseCandle =
        candles[impulse.index];

    if (
        impulseCandle &&
        impulseCandle.range > 0 &&
        impulseCandle.bodySize /
        impulseCandle.range >= 0.5
    ) {
        score += 15;
    }

    // Check if the OB has not been immediately invalidated.
    let invalidated = false;

    for (
        let i = impulse.index + 1;
        i < candles.length;
        i++
    ) {
        if (
            impulse.direction === "BULLISH" &&
            candles[i].close < ob.low
        ) {
            invalidated = true;
            break;
        }

        if (
            impulse.direction === "BEARISH" &&
            candles[i].close > ob.high
        ) {
            invalidated = true;
            break;
        }
    }

    if (!invalidated) {
        score += 15;
    }

    return Math.min(100, score);
}

function deduplicateOrderBlocks(orderBlocks) {
    const result = [];
    const seen = new Set();

    for (const ob of orderBlocks) {
        const key =
            `${ob.type}-${ob.index}-${Number(ob.high).toFixed(5)}-${Number(ob.low).toFixed(5)}`;

        if (!seen.has(key)) {
            seen.add(key);
            result.push(ob);
        }
    }

    return result;
}

// ============================================================
// ORDER BLOCK MITIGATION
// ============================================================

function markOrderBlockMitigation(orderBlocks, candles) {
    return orderBlocks.map(ob => {
        let mitigated = false;

        for (
            let i = ob.impulseIndex + 1;
            i < candles.length;
            i++
        ) {
            const candle = candles[i];

            if (
                ob.direction === "BULLISH" &&
                candle.low <= ob.low
            ) {
                mitigated = true;
                break;
            }

            if (
                ob.direction === "BEARISH" &&
                candle.high >= ob.high
            ) {
                mitigated = true;
                break;
            }
        }

        return {
            ...ob,
            mitigated
        };
    });
}

// ============================================================
// PREMIUM / DISCOUNT
// ============================================================

function calculatePremiumDiscount(candles, structure) {
    if (
        !structure.lastHigh ||
        !structure.lastLow
    ) {
        return {
            available: false,
            zone: "UNKNOWN"
        };
    }

    const high = structure.lastHigh.price;
    const low = structure.lastLow.price;

    const range = high - low;

    if (range <= 0) {
        return {
            available: false,
            zone: "UNKNOWN"
        };
    }

    const currentPrice =
        candles[candles.length - 1].close;

    const equilibrium =
        low + range * 0.5;

    const position =
        (currentPrice - low) /
        range *
        100;

    let zone = "EQUILIBRIUM";

    if (position > 50) {
        zone = "PREMIUM";
    } else if (position < 50) {
        zone = "DISCOUNT";
    }

    return {
        available: true,
        high,
        low,
        equilibrium,
        currentPrice,
        positionPercent: Number(
            position.toFixed(2)
        ),
        zone
    };
}

// ============================================================
// FVG SCORE
// ============================================================

function scoreFVG(
    fvg,
    candles,
    structure,
    liquiditySweeps,
    bos,
    displacement
) {
    let score = 20;

    const relatedDisplacement =
        displacement.some(
            d =>
                Math.abs(
                    d.index - fvg.index
                ) <= 2 &&
                d.direction === fvg.direction
        );

    if (relatedDisplacement) {
        score += 20;
    }

    const relatedBOS =
        bos.some(
            b =>
                Math.abs(
                    b.index - fvg.index
                ) <= 5 &&
                (
                    fvg.direction === "BULLISH"
                        ? b.type === "BULLISH_BOS"
                        : b.type === "BEARISH_BOS"
                )
        );

    if (relatedBOS) {
        score += 20;
    }

    const relatedSweep =
        liquiditySweeps.some(
            sweep =>
                Math.abs(
                    sweep.index - fvg.index
                ) <= 6 &&
                sweep.direction === fvg.direction
        );

    if (relatedSweep) {
        score += 20;
    }

    if (
        structure.trend === fvg.direction
    ) {
        score += 20;
    }

    return Math.min(100, score);
}

// ============================================================
// SETUP SCORE
// ============================================================

function calculateSetupScore({
    direction,
    structure,
    fvg,
    orderBlock,
    liquiditySweep,
    bos,
    choch,
    displacement,
    premiumDiscount
}) {
    let score = 0;

    // Market structure
    if (structure.trend === direction) {
        score += 15;
    }

    // Liquidity sweep
    if (
        liquiditySweep &&
        liquiditySweep.direction === direction
    ) {
        score += 20;
    }

    // BOS
    if (
        bos &&
        (
            direction === "BULLISH"
                ? bos.type === "BULLISH_BOS"
                : bos.type === "BEARISH_BOS"
        )
    ) {
        score += 20;
    }

    // CHOCH
    if (
        choch &&
        (
            direction === "BULLISH"
                ? choch.type === "BULLISH_CHOCH"
                : choch.type === "BEARISH_CHOCH"
        )
    ) {
        score += 10;
    }

    // Displacement
    if (
        displacement &&
        displacement.direction === direction
    ) {
        score += 15;
    }

    // FVG
    if (
        fvg &&
        fvg.direction === direction
    ) {
        score += 10;
    }

    // Order Block
    if (
        orderBlock &&
        orderBlock.direction === direction
    ) {
        score += 10;
    }

    // Premium / Discount alignment
    if (premiumDiscount?.available) {
        if (
            direction === "BULLISH" &&
            premiumDiscount.zone === "DISCOUNT"
        ) {
            score += 5;
        }

        if (
            direction === "BEARISH" &&
            premiumDiscount.zone === "PREMIUM"
        ) {
            score += 5;
        }
    }

    return Math.min(100, score);
}

// ============================================================
// CURRENT SETUP
// ============================================================

function buildCurrentSetup({
    candles,
    structure,
    fvgs,
    orderBlocks,
    liquiditySweeps,
    bos,
    choch,
    displacement,
    premiumDiscount
}) {
    if (!candles.length) {
        return {
            direction: "NEUTRAL",
            score: 0,
            strength: "WEAK",
            decision: "WAIT"
        };
    }

    const lastIndex =
        candles.length - 1;

    const recentFVGs =
        fvgs.filter(
            fvg =>
                fvg.index >= lastIndex - 15
        );

    const recentOBs =
        orderBlocks.filter(
            ob =>
                ob.index >= lastIndex - 20
        );

    const recentSweeps =
        liquiditySweeps.filter(
            sweep =>
                sweep.index >= lastIndex - 10
        );

    const recentBOS =
        bos.filter(
            event =>
                event.index >= lastIndex - 10
        );

    const recentCHOCH =
        choch.filter(
            event =>
                event.index >= lastIndex - 10
        );

    const recentDisplacement =
        displacement.filter(
            event =>
                event.index >= lastIndex - 10
        );

    const bullishFVG =
        recentFVGs
            .filter(
                f => f.direction === "BULLISH"
            )
            .sort(
                (a, b) => b.score - a.score
            )[0];

    const bearishFVG =
        recentFVGs
            .filter(
                f => f.direction === "BEARISH"
            )
            .sort(
                (a, b) => b.score - a.score
            )[0];

    const bullishOB =
        recentOBs
            .filter(
                ob => ob.direction === "BULLISH"
            )
            .sort(
                (a, b) => b.score - a.score
            )[0];

    const bearishOB =
        recentOBs
            .filter(
                ob => ob.direction === "BEARISH"
            )
            .sort(
                (a, b) => b.score - a.score
            )[0];

    const bullishSweep =
        recentSweeps
            .filter(
                s => s.direction === "BULLISH"
            )
            .sort(
                (a, b) => b.index - a.index
            )[0];

    const bearishSweep =
        recentSweeps
            .filter(
                s => s.direction === "BEARISH"
            )
            .sort(
                (a, b) => b.index - a.index
            )[0];

    const bullishBOS =
        recentBOS.find(
            b => b.type === "BULLISH_BOS"
        );

    const bearishBOS =
        recentBOS.find(
            b => b.type === "BEARISH_BOS"
        );

    const bullishCHOCH =
        recentCHOCH.find(
            c => c.type === "BULLISH_CHOCH"
        );

    const bearishCHOCH =
        recentCHOCH.find(
            c => c.type === "BEARISH_CHOCH"
        );

    const bullishDisplacement =
        recentDisplacement.find(
            d => d.direction === "BULLISH"
        );

    const bearishDisplacement =
        recentDisplacement.find(
            d => d.direction === "BEARISH"
        );

    const bullishScore =
        calculateSetupScore({
            direction: "BULLISH",
            structure,
            fvg: bullishFVG,
            orderBlock: bullishOB,
            liquiditySweep: bullishSweep,
            bos: bullishBOS,
            choch: bullishCHOCH,
            displacement: bullishDisplacement,
            premiumDiscount
        });

    const bearishScore =
        calculateSetupScore({
            direction: "BEARISH",
            structure,
            fvg: bearishFVG,
            orderBlock: bearishOB,
            liquiditySweep: bearishSweep,
            bos: bearishBOS,
            choch: bearishCHOCH,
            displacement: bearishDisplacement,
            premiumDiscount
        });

    let direction = "NEUTRAL";
    let score = Math.max(
        bullishScore,
        bearishScore
    );

    if (
        bullishScore > bearishScore &&
        bullishScore >= CONFIG.moderateScore
    ) {
        direction = "BULLISH";
    } else if (
        bearishScore > bullishScore &&
        bearishScore >= CONFIG.moderateScore
    ) {
        direction = "BEARISH";
    } else {
        direction = "NEUTRAL";
        score = Math.max(
            bullishScore,
            bearishScore
        );
    }

    const decision =
        score >= CONFIG.goodScore &&
        direction !== "NEUTRAL"
            ? direction === "BULLISH"
                ? "BUY"
                : "SELL"
            : "WAIT";

    return {
        direction,
        score,
        strength: scoreLabel(score),
        decision,

        bullishScore,
        bearishScore,

        fvg:
            direction === "BULLISH"
                ? bullishFVG || null
                : bearishFVG || null,

        orderBlock:
            direction === "BULLISH"
                ? bullishOB || null
                : bearishOB || null,

        liquiditySweep:
            direction === "BULLISH"
                ? bullishSweep || null
                : bearishSweep || null,

        bos:
            direction === "BULLISH"
                ? bullishBOS || null
                : bearishBOS || null,

        choch:
            direction === "BULLISH"
                ? bullishCHOCH || null
                : bearishCHOCH || null,

        displacement:
            direction === "BULLISH"
                ? bullishDisplacement || null
                : bearishDisplacement || null
    };
}

// ============================================================
// MAIN ANALYZER
// ============================================================

function analyzeSMC(inputCandles) {
    const candles =
        normalizeCandles(inputCandles);

    if (
        candles.length <
        CONFIG.minCandles
    ) {
        return {
            ok: false,

            error:
                "Not enough valid candles for SMC analysis.",

            candlesAnalyzed: candles.length,

            requiredCandles:
                CONFIG.minCandles
        };
    }

    const structure =
        detectMarketStructure(candles);

    const bos =
        detectBOS(
            candles,
            structure
        );

    const choch =
        detectCHOCH(
            candles,
            structure
        );

    const displacement =
        detectDisplacement(candles);

    const liquidity =
        detectLiquidity(candles);

    const liquiditySweeps =
        detectLiquiditySweeps(
            candles,
            liquidity
        );

    let fvgs =
        detectFairValueGaps(candles);

    fvgs =
        markFVGMitigation(
            fvgs,
            candles
        );

    fvgs =
        fvgs.map(fvg => ({
            ...fvg,
            score: scoreFVG(
                fvg,
                candles,
                structure,
                liquiditySweeps,
                bos,
                displacement
            ),
            strength: scoreLabel(
                scoreFVG(
                    fvg,
                    candles,
                    structure,
                    liquiditySweeps,
                    bos,
                    displacement
                )
            )
        }));

    let orderBlocks =
        detectOrderBlocks(candles);

    orderBlocks =
        markOrderBlockMitigation(
            orderBlocks,
            candles
        );

    const premiumDiscount =
        calculatePremiumDiscount(
            candles,
            structure
        );

    const currentSetup =
        buildCurrentSetup({
            candles,
            structure,
            fvgs,
            orderBlocks,
            liquiditySweeps,
            bos,
            choch,
            displacement,
            premiumDiscount
        });

    return {
        ok: true,

        engine: "ShahanFX SMC Engine",

        version: "2.1.0",

        candlesAnalyzed:
            candles.length,

        currentPrice:
            candles[candles.length - 1].close,

        marketStructure: {
            trend:
                structure.trend,

            lastHigh:
                structure.lastHigh || null,

            previousHigh:
                structure.previousHigh || null,

            lastLow:
                structure.lastLow || null,

            previousLow:
                structure.previousLow || null
        },

        bos: bos.slice(-10),

        choch: choch.slice(-10),

        displacement:
            displacement.slice(-10),

        liquidity:
            liquidity.slice(-20),

        liquiditySweeps:
            liquiditySweeps.slice(-10),

        fvg:
            fvgs
                .filter(
                    fvg =>
                        !fvg.mitigated
                )
                .sort(
                    (a, b) =>
                        b.score - a.score
                )
                .slice(
                    0,
                    CONFIG.maxFVGs
                ),

        orderBlocks:
            orderBlocks
                .filter(
                    ob =>
                        !ob.mitigated
                )
                .slice(
                    0,
                    CONFIG.maxOrderBlocks
                ),

        premiumDiscount,

        setup: currentSetup,

        summary: {
            bias:
                currentSetup.direction,

            score:
                currentSetup.score,

            strength:
                currentSetup.strength,

            decision:
                currentSetup.decision
        }
    };
}

// ============================================================
// EXPORTS
// ============================================================

export {
    analyzeSMC,

    detectFairValueGaps,
    detectOrderBlocks,

    detectLiquidity,
    detectLiquiditySweeps,

    detectMarketStructure,
    detectSwingPoints,

    detectBOS,
    detectCHOCH,

    detectDisplacement,

    calculatePremiumDiscount
};

export default analyzeSMC;
