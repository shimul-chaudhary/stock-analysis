import { Router } from "express";
import { getGlobalQuote, getCompanyOverview, getNewsAndSentiment } from "../../lib/alphavantage";
import { ScreenStocksQueryParams } from "@workspace/api-zod";

const router = Router();

const SCREENED_SYMBOLS = [
  "NVDA", "AVGO", "MRVL", "ANET", "VST",
  "CEG", "LITE", "SMCI", "ONTO", "WOLF",
  "ASTS", "IONQ", "QUBT", "RGTI", "ACHR",
];

const MACRO_KEYWORD_MAP: Record<string, string[]> = {
  NVDA: ["AI Data Center", "1.6T Networking", "National Security Tech"],
  AVGO: ["AI Data Center", "1.6T Networking"],
  MRVL: ["AI Data Center", "1.6T Networking", "National Security Tech"],
  ANET: ["1.6T Networking", "AI Data Center"],
  VST: ["Energy Grid", "AI Data Center"],
  CEG: ["Energy Grid", "National Security Tech"],
  LITE: ["1.6T Networking", "AI Data Center", "National Security Tech"],
  SMCI: ["AI Data Center", "National Security Tech"],
  ONTO: ["National Security Tech", "Domestic Semiconductor"],
  WOLF: ["Domestic Semiconductor", "Energy Grid"],
  ASTS: ["National Security Tech"],
  IONQ: ["National Security Tech", "Domestic Semiconductor"],
  QUBT: ["National Security Tech"],
  RGTI: ["National Security Tech"],
  ACHR: ["Energy Grid"],
};

function computeBreakoutScore(revenueGrowth: number, institutionalOwnership: number, macroKeywords: string[]): number {
  let score = 0;
  if (revenueGrowth > 0.4) score += 40;
  else if (revenueGrowth > 0.2) score += 20;
  else if (revenueGrowth > 0) score += 10;
  score += Math.min(institutionalOwnership * 30, 30);
  score += Math.min(macroKeywords.length * 10, 30);
  return Math.min(Math.round(score), 100);
}

function computeGeopoliticalScore(macroKeywords: string[], sector: string): number {
  let score = 30;
  if (macroKeywords.includes("National Security Tech")) score += 25;
  if (macroKeywords.includes("1.6T Networking")) score += 15;
  if (macroKeywords.includes("AI Data Center")) score += 15;
  if (macroKeywords.includes("Domestic Semiconductor")) score += 20;
  if (macroKeywords.includes("Energy Grid")) score += 10;
  if (sector?.includes("Technology")) score += 5;
  return Math.min(score, 100);
}

function getRiskProfile(peRatio: number, revenueGrowth: number): "high_growth" | "balanced" | "value_stability" {
  if (peRatio > 50 || revenueGrowth > 0.4) return "high_growth";
  if (peRatio > 20 || revenueGrowth > 0.15) return "balanced";
  return "value_stability";
}

const mockFundamentals: Record<string, { revenueGrowth: number; institutionalOwnership: number; grossMargin: number; isSoldOut: boolean }> = {
  NVDA: { revenueGrowth: 1.22, institutionalOwnership: 0.68, grossMargin: 0.73, isSoldOut: true },
  AVGO: { revenueGrowth: 0.51, institutionalOwnership: 0.72, grossMargin: 0.61, isSoldOut: false },
  MRVL: { revenueGrowth: 0.61, institutionalOwnership: 0.79, grossMargin: 0.51, isSoldOut: false },
  ANET: { revenueGrowth: 0.24, institutionalOwnership: 0.81, grossMargin: 0.64, isSoldOut: false },
  VST: { revenueGrowth: 0.43, institutionalOwnership: 0.85, grossMargin: 0.28, isSoldOut: false },
  CEG: { revenueGrowth: 0.38, institutionalOwnership: 0.78, grossMargin: 0.31, isSoldOut: false },
  LITE: { revenueGrowth: 0.47, institutionalOwnership: 0.62, grossMargin: 0.44, isSoldOut: true },
  SMCI: { revenueGrowth: 0.55, institutionalOwnership: 0.45, grossMargin: 0.15, isSoldOut: true },
  ONTO: { revenueGrowth: 0.41, institutionalOwnership: 0.91, grossMargin: 0.47, isSoldOut: false },
  WOLF: { revenueGrowth: 0.18, institutionalOwnership: 0.55, grossMargin: 0.12, isSoldOut: false },
  ASTS: { revenueGrowth: 2.10, institutionalOwnership: 0.41, grossMargin: 0.22, isSoldOut: false },
  IONQ: { revenueGrowth: 0.95, institutionalOwnership: 0.38, grossMargin: 0.55, isSoldOut: false },
  QUBT: { revenueGrowth: 1.40, institutionalOwnership: 0.28, grossMargin: 0.48, isSoldOut: false },
  RGTI: { revenueGrowth: 0.87, institutionalOwnership: 0.31, grossMargin: 0.51, isSoldOut: false },
  ACHR: { revenueGrowth: 0.62, institutionalOwnership: 0.44, grossMargin: 0.18, isSoldOut: false },
};

router.get("/stocks/summary", async (req, res) => {
  try {
    const sectorCounts: Record<string, { count: number; totalScore: number }> = {};
    let totalScore = 0;
    for (const sym of SCREENED_SYMBOLS) {
      const fund = mockFundamentals[sym] ?? { revenueGrowth: 0.1, institutionalOwnership: 0.5, grossMargin: 0.3, isSoldOut: false };
      const keywords = MACRO_KEYWORD_MAP[sym] ?? [];
      const score = computeBreakoutScore(fund.revenueGrowth, fund.institutionalOwnership, keywords);
      totalScore += score;
      const sector = sym === "VST" || sym === "CEG" || sym === "ACHR" ? "Energy" : "Technology";
      if (!sectorCounts[sector]) sectorCounts[sector] = { count: 0, totalScore: 0 };
      sectorCounts[sector].count++;
      sectorCounts[sector].totalScore += score;
    }
    const topSectors = Object.entries(sectorCounts).map(([sector, { count, totalScore: ts }]) => ({
      sector,
      count,
      avgScore: Math.round(ts / count),
    }));
    res.json({
      totalScreened: SCREENED_SYMBOLS.length,
      highGrowthCount: Object.values(mockFundamentals).filter(f => f.revenueGrowth > 0.4).length,
      newDiscoveries: 3,
      avgBreakoutScore: Math.round(totalScore / SCREENED_SYMBOLS.length),
      topSectors,
      topMacroTheme: "AI Data Center Buildout",
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get market summary" });
  }
});

router.get("/stocks/screen", async (req, res) => {
  try {
    const parsed = ScreenStocksQueryParams.safeParse(req.query);
    const riskProfile = parsed.success ? parsed.data.riskProfile : undefined;

    const results = await Promise.all(
      SCREENED_SYMBOLS.map(async (symbol) => {
        try {
          const [quote, overview] = await Promise.all([
            getGlobalQuote(symbol),
            getCompanyOverview(symbol),
          ]);
          const fund = mockFundamentals[symbol] ?? { revenueGrowth: 0.1, institutionalOwnership: 0.5, grossMargin: 0.3, isSoldOut: false };
          const macroKeywords = MACRO_KEYWORD_MAP[symbol] ?? [];
          const price = quote?.price ?? 100;
          const peRatio = overview?.peRatio ?? 25;
          const marketCap = overview?.marketCap ?? 1e9;
          const revenueGrowth = fund.revenueGrowth;
          const institutionalOwnership = fund.institutionalOwnership;
          const sector = overview?.sector ?? "Technology";
          const breakoutScore = computeBreakoutScore(revenueGrowth, institutionalOwnership, macroKeywords);
          const geopoliticalScore = computeGeopoliticalScore(macroKeywords, sector);
          const profile = getRiskProfile(peRatio, revenueGrowth);
          return {
            symbol,
            name: overview?.name ?? symbol,
            sector,
            price,
            change: quote?.change ?? 0,
            changePercent: quote?.changePercent ?? 0,
            revenueGrowth,
            peRatio,
            marketCap,
            institutionalOwnership,
            macroKeywords,
            geopoliticalScore,
            breakoutScore,
            riskProfile: profile,
            isSoldOut: fund.isSoldOut,
          };
        } catch {
          const fund = mockFundamentals[symbol] ?? { revenueGrowth: 0.1, institutionalOwnership: 0.5, grossMargin: 0.3, isSoldOut: false };
          const macroKeywords = MACRO_KEYWORD_MAP[symbol] ?? [];
          const revenueGrowth = fund.revenueGrowth;
          const institutionalOwnership = fund.institutionalOwnership;
          const peRatio = 30;
          const breakoutScore = computeBreakoutScore(revenueGrowth, institutionalOwnership, macroKeywords);
          const geopoliticalScore = computeGeopoliticalScore(macroKeywords, "Technology");
          return {
            symbol,
            name: symbol,
            sector: "Technology",
            price: 0,
            change: 0,
            changePercent: 0,
            revenueGrowth,
            peRatio,
            marketCap: 0,
            institutionalOwnership,
            macroKeywords,
            geopoliticalScore,
            breakoutScore,
            riskProfile: getRiskProfile(peRatio, revenueGrowth),
            isSoldOut: fund.isSoldOut,
          };
        }
      })
    );

    const filtered = riskProfile ? results.filter(r => r.riskProfile === riskProfile) : results;
    res.json(filtered.sort((a, b) => b.breakoutScore - a.breakoutScore));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Screening failed" });
  }
});

router.get("/stocks/:symbol/quote", async (req, res) => {
  const { symbol } = req.params;
  try {
    const [quote, overview] = await Promise.all([
      getGlobalQuote(symbol),
      getCompanyOverview(symbol),
    ]);
    if (!quote && !overview) {
      res.status(404).json({ error: "Symbol not found" });
      return;
    }
    const fund = mockFundamentals[symbol] ?? { revenueGrowth: 0.1, institutionalOwnership: 0.5, grossMargin: 0.3, isSoldOut: false };
    res.json({
      symbol: symbol.toUpperCase(),
      name: overview?.name ?? symbol,
      price: quote?.price ?? 0,
      open: quote?.open ?? 0,
      high: quote?.high ?? 0,
      low: quote?.low ?? 0,
      volume: quote?.volume ?? 0,
      peRatio: overview?.peRatio ?? 0,
      eps: overview?.eps ?? 0,
      revenueGrowth: fund.revenueGrowth,
      grossMargin: fund.grossMargin,
      institutionalOwnership: fund.institutionalOwnership,
      fiftyTwoWeekHigh: overview?.fiftyTwoWeekHigh ?? 0,
      fiftyTwoWeekLow: overview?.fiftyTwoWeekLow ?? 0,
      marketCap: overview?.marketCap ?? 0,
      dividendYield: overview?.dividendYield ?? 0,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch quote" });
  }
});

router.get("/stocks/:symbol/news", async (req, res) => {
  const { symbol } = req.params;
  const limit = parseInt(String(req.query.limit ?? "10"), 10);
  try {
    const news = await getNewsAndSentiment(symbol, limit);
    res.json(news);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

export default router;
