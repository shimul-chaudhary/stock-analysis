import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";
import { DeepDiveAnalysisBody, AnalyzeHoldingsBody } from "@workspace/api-zod";

const router = Router();

const GEOPOLITICAL_CONTEXT = `Current macro environment (May 2026):
- US-China tech trade fragmentation: Export controls on advanced AI chips/hardware to China
- Oil prices above $100/bbl driving energy infrastructure investment
- CHIPS Act funding $52B+ in domestic semiconductor manufacturing
- AI data center buildout demanding $1.6T in networking and power infrastructure
- Taiwan Strait tensions posing tail risk to semiconductor supply chains
- Federal Reserve holding rates elevated pressuring high-multiple growth stocks
- DOD/NSA mandating quantum-resistant encryption and domestic satellite comms by 2027`;

router.post("/analysis/deep-dive", async (req, res) => {
  const parsed = DeepDiveAnalysisBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { symbol, name, peRatio, revenueGrowth, marketCap, institutionalOwnership, headlines, geopoliticalContext } = parsed.data;

  const headlineText = headlines && headlines.length > 0
    ? headlines.slice(0, 10).map((h, i) => `${i + 1}. ${h}`).join("\n")
    : "No recent headlines available.";

  const marketCapFormatted = marketCap ? `$${(marketCap / 1e9).toFixed(1)}B` : "N/A";
  const revenueGrowthFormatted = revenueGrowth ? `${(revenueGrowth * 100).toFixed(1)}%` : "N/A";
  const institutionalOwnershipFormatted = institutionalOwnership ? `${(institutionalOwnership * 100).toFixed(1)}%` : "N/A";

  const prompt = `You are a senior equity analyst specializing in high-growth infrastructure and technology stocks. Analyze ${symbol} (${name}) and provide a structured investment report.

FUNDAMENTAL DATA:
- P/E Ratio: ${peRatio ?? "N/A"}
- Revenue Growth (YoY): ${revenueGrowthFormatted}
- Market Cap: ${marketCapFormatted}
- Institutional Ownership: ${institutionalOwnershipFormatted}

RECENT NEWS HEADLINES:
${headlineText}

MACRO/GEOPOLITICAL CONTEXT:
${geopoliticalContext ?? GEOPOLITICAL_CONTEXT}

Provide your analysis in the following JSON format ONLY (no markdown, no preamble):
{
  "bullCase": "3-4 sentences explaining why this could be the next breakout infrastructure stock. Focus on catalysts, competitive moats, and macro tailwinds.",
  "bearCase": "3-4 sentences covering the key risks: valuation concerns, execution risk, geopolitical exposure, competitive threats.",
  "verdict": "Accumulate" | "Hold" | "Avoid",
  "verdictReasoning": "2-3 sentences justifying the verdict given current macro conditions and fundamentals.",
  "confidenceScore": <integer 0-100>,
  "keyRisks": ["risk1", "risk2", "risk3"],
  "catalysts": ["catalyst1", "catalyst2", "catalyst3"]
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });

    const text = response.text ?? "{}";
    let parsed_response: {
      bullCase?: string;
      bearCase?: string;
      verdict?: string;
      verdictReasoning?: string;
      confidenceScore?: number;
      keyRisks?: string[];
      catalysts?: string[];
    };
    try {
      parsed_response = JSON.parse(text);
    } catch {
      parsed_response = {};
    }

    const verdict = (["Accumulate", "Hold", "Avoid"].includes(parsed_response.verdict ?? ""))
      ? parsed_response.verdict as "Accumulate" | "Hold" | "Avoid"
      : "Hold";

    res.json({
      symbol: symbol.toUpperCase(),
      bullCase: parsed_response.bullCase ?? "Analysis unavailable.",
      bearCase: parsed_response.bearCase ?? "Analysis unavailable.",
      verdict,
      verdictReasoning: parsed_response.verdictReasoning ?? "",
      confidenceScore: parsed_response.confidenceScore ?? 50,
      keyRisks: parsed_response.keyRisks ?? [],
      catalysts: parsed_response.catalysts ?? [],
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to generate analysis" });
  }
});

router.post("/analysis/holdings", async (req, res) => {
  const parsed = AnalyzeHoldingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { holdings } = parsed.data;

  const holdingsList = holdings.map(h => `- ${h.symbol} (${h.name}): ${h.shares} shares`).join("\n");

  const prompt = `You are a senior portfolio risk analyst specializing in geopolitical and macro risk. Analyze the following portfolio against the current macro landscape.

PORTFOLIO HOLDINGS:
${holdingsList}

CURRENT MACRO ENVIRONMENT (May 2026):
${GEOPOLITICAL_CONTEXT}

Respond in the following JSON format ONLY (no markdown):
{
  "overallRisk": "Low" | "Medium" | "High" | "Critical",
  "summary": "2-3 sentences summarizing the portfolio's overall macro risk profile.",
  "stockAnalyses": [
    {
      "symbol": "SYMBOL",
      "geopoliticalRisk": "Low" | "Medium" | "High" | "Critical",
      "riskFactors": ["factor1", "factor2"],
      "recommendation": "One sentence recommendation."
    }
  ],
  "macroThreats": ["threat1", "threat2", "threat3"],
  "opportunities": ["opportunity1", "opportunity2", "opportunity3"]
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });

    const text = response.text ?? "{}";
    let result: {
      overallRisk?: string;
      summary?: string;
      stockAnalyses?: Array<{
        symbol: string;
        geopoliticalRisk: string;
        riskFactors: string[];
        recommendation: string;
      }>;
      macroThreats?: string[];
      opportunities?: string[];
    };
    try {
      result = JSON.parse(text);
    } catch {
      result = {};
    }

    const validRisks = ["Low", "Medium", "High", "Critical"];
    const overallRisk = validRisks.includes(result.overallRisk ?? "") ? result.overallRisk as "Low" | "Medium" | "High" | "Critical" : "Medium";

    res.json({
      overallRisk,
      summary: result.summary ?? "Analysis unavailable.",
      stockAnalyses: (result.stockAnalyses ?? []).map(s => ({
        symbol: s.symbol,
        geopoliticalRisk: validRisks.includes(s.geopoliticalRisk) ? s.geopoliticalRisk as "Low" | "Medium" | "High" | "Critical" : "Medium",
        riskFactors: s.riskFactors ?? [],
        recommendation: s.recommendation ?? "",
      })),
      macroThreats: result.macroThreats ?? [],
      opportunities: result.opportunities ?? [],
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to analyze holdings" });
  }
});

export default router;
