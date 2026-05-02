import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from lib.gemini import generate_json

router = APIRouter()

GEOPOLITICAL_CONTEXT = """Current macro environment (May 2026):
- US-China tech trade fragmentation: Export controls on advanced AI chips/hardware to China
- Oil prices above $100/bbl driving energy infrastructure investment
- CHIPS Act funding $52B+ in domestic semiconductor manufacturing
- AI data center buildout demanding $1.6T in networking and power infrastructure
- Taiwan Strait tensions posing tail risk to semiconductor supply chains
- Federal Reserve holding rates elevated pressuring high-multiple growth stocks
- DOD/NSA mandating quantum-resistant encryption and domestic satellite comms by 2027"""


class DeepDiveBody(BaseModel):
    symbol: str
    name: str
    peRatio: Optional[float] = None
    revenueGrowth: Optional[float] = None
    marketCap: Optional[float] = None
    institutionalOwnership: Optional[float] = None
    headlines: Optional[list[str]] = None
    geopoliticalContext: Optional[str] = None


class HoldingItem(BaseModel):
    symbol: str
    name: str
    shares: float


class AnalyzeHoldingsBody(BaseModel):
    holdings: list[HoldingItem]


@router.post("/analysis/deep-dive")
async def deep_dive(body: DeepDiveBody):
    headline_text = (
        "\n".join(f"{i+1}. {h}" for i, h in enumerate((body.headlines or [])[:10]))
        or "No recent headlines available."
    )
    market_cap_fmt = f"${body.marketCap / 1e9:.1f}B" if body.marketCap else "N/A"
    rev_growth_fmt = f"{body.revenueGrowth * 100:.1f}%" if body.revenueGrowth is not None else "N/A"
    inst_own_fmt = f"{body.institutionalOwnership * 100:.1f}%" if body.institutionalOwnership is not None else "N/A"

    prompt = f"""You are a senior equity analyst specializing in high-growth infrastructure and technology stocks. Analyze {body.symbol} ({body.name}) and provide a structured investment report.

FUNDAMENTAL DATA:
- P/E Ratio: {body.peRatio or "N/A"}
- Revenue Growth (YoY): {rev_growth_fmt}
- Market Cap: {market_cap_fmt}
- Institutional Ownership: {inst_own_fmt}

RECENT NEWS HEADLINES:
{headline_text}

MACRO/GEOPOLITICAL CONTEXT:
{body.geopoliticalContext or GEOPOLITICAL_CONTEXT}

Provide your analysis in the following JSON format ONLY (no markdown, no preamble):
{{
  "bullCase": "3-4 sentences explaining why this could be the next breakout infrastructure stock. Focus on catalysts, competitive moats, and macro tailwinds.",
  "bearCase": "3-4 sentences covering the key risks: valuation concerns, execution risk, geopolitical exposure, competitive threats.",
  "verdict": "Accumulate" | "Hold" | "Avoid",
  "verdictReasoning": "2-3 sentences justifying the verdict given current macro conditions and fundamentals.",
  "confidenceScore": <integer 0-100>,
  "keyRisks": ["risk1", "risk2", "risk3"],
  "catalysts": ["catalyst1", "catalyst2", "catalyst3"]
}}"""

    try:
        text = await generate_json(prompt)
        result = json.loads(text)
    except Exception:
        result = {}

    valid_verdicts = {"Accumulate", "Hold", "Avoid"}
    verdict = result.get("verdict", "Hold") if result.get("verdict") in valid_verdicts else "Hold"

    return {
        "symbol": body.symbol.upper(),
        "bullCase": result.get("bullCase", "Analysis unavailable."),
        "bearCase": result.get("bearCase", "Analysis unavailable."),
        "verdict": verdict,
        "verdictReasoning": result.get("verdictReasoning", ""),
        "confidenceScore": result.get("confidenceScore", 50),
        "keyRisks": result.get("keyRisks", []),
        "catalysts": result.get("catalysts", []),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/analysis/holdings")
async def analyze_holdings(body: AnalyzeHoldingsBody):
    if not body.holdings:
        raise HTTPException(status_code=400, detail="No holdings provided")

    holdings_list = "\n".join(f"- {h.symbol} ({h.name}): {h.shares} shares" for h in body.holdings)

    prompt = f"""You are a senior portfolio risk analyst specializing in geopolitical and macro risk. Analyze the following portfolio against the current macro landscape.

PORTFOLIO HOLDINGS:
{holdings_list}

CURRENT MACRO ENVIRONMENT (May 2026):
{GEOPOLITICAL_CONTEXT}

Respond in the following JSON format ONLY (no markdown):
{{
  "overallRisk": "Low" | "Medium" | "High" | "Critical",
  "summary": "2-3 sentences summarizing the portfolio's overall macro risk profile.",
  "stockAnalyses": [
    {{
      "symbol": "SYMBOL",
      "geopoliticalRisk": "Low" | "Medium" | "High" | "Critical",
      "riskFactors": ["factor1", "factor2"],
      "recommendation": "One sentence recommendation."
    }}
  ],
  "macroThreats": ["threat1", "threat2", "threat3"],
  "opportunities": ["opportunity1", "opportunity2", "opportunity3"]
}}"""

    try:
        text = await generate_json(prompt)
        result = json.loads(text)
    except Exception:
        result = {}

    valid_risks = {"Low", "Medium", "High", "Critical"}
    overall_risk = result.get("overallRisk", "Medium") if result.get("overallRisk") in valid_risks else "Medium"

    stock_analyses = [
        {
            "symbol": s.get("symbol", ""),
            "geopoliticalRisk": s.get("geopoliticalRisk", "Medium") if s.get("geopoliticalRisk") in valid_risks else "Medium",
            "riskFactors": s.get("riskFactors", []),
            "recommendation": s.get("recommendation", ""),
        }
        for s in result.get("stockAnalyses", [])
    ]

    return {
        "overallRisk": overall_risk,
        "summary": result.get("summary", "Analysis unavailable."),
        "stockAnalyses": stock_analyses,
        "macroThreats": result.get("macroThreats", []),
        "opportunities": result.get("opportunities", []),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }
