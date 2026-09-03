// utils/smcAnalyzer.js

function detectFairValueGaps(candles) {
    const fvgs = [];
    for (let i = 0; i < candles.length - 2; i++) {
        const c1 = candles[i];     // مۆمی یەکەم
        const c2 = candles[i+1];   // مۆمی تێپەڕیو (Impulse)
        const c3 = candles[i+2];   // مۆمی سێیەم

        // Bullish FVG: کاتێک نزمی مۆمی سێیەم لە سەروو بەرزی مۆمی یەکەمەوەیە
        if (c3.low > c1.high && c2.close > c2.open) {
            fvgs.setItem?.({ type: 'BULLISH_FVG', top: c3.low, bottom: c1.high, index: i+1 });
            fvgs.push({ type: 'BULLISH_FVG', top: c3.low, bottom: c1.high });
        }
        // Bearish FVG: کاتێک بەرزی مۆمی سێیەم لە خوار نزمی مۆمی یەکەمەوەیە
        else if (c3.high < c1.low && c2.close < c2.open) {
            fvgs.push({ type: 'BEARISH_FVG', top: c1.low, bottom: c3.high });
        }
    }
    return fvgs;
}

function detectOrderBlocks(candles) {
    const orderBlocks = [];
    for (let i = 0; i < candles.length - 1; i++) {
        const current = candles[i];
        const next = candles[i+1];

        // Bullish Order Block: دوای مۆمێکی داڕماو (سۆر)، مۆمێکی سەوزی بەهێز بازدان دروست دەکات
        if (current.close < current.open && next.close > next.open && next.bodySize > current.bodySize * 1.5) {
            orderBlocks.push({ type: 'BULLISH_OB', high: current.high, low: current.low });
        }
        // Bearish Order Block: دوای مۆمێکی سەوز، مۆمێکی سۆری بەهێز دێتە خوارەوە
        else if (current.close > current.open && next.close < next.open && next.bodySize > current.bodySize * 1.5) {
            orderBlocks.push({ type: 'BEARISH_OB', high: current.high, low: current.low });
        }
    }
    return orderBlocks;
}

export { detectFairValueGaps, detectOrderBlocks };
