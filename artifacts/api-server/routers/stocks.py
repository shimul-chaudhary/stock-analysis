import asyncio
from typing import Optional
from fastapi import APIRouter, Query
from lib.alphavantage import get_global_quote, get_company_overview, get_news_and_sentiment

router = APIRouter()

SCREENED_SYMBOLS = [
    "NVDA", "AVGO", "MRVL", "ANET", "VST",
    "CEG", "LITE", "SMCI", "ONTO", "WOLF",
    "ASTS", "IONQ", "QUBT", "RGTI", "ACHR",
]

MACRO_KEYWORD_MAP: dict[str, list[str]] = {
    "NVDA": ["AI Data Center", "1.6T Networking", "National Security Tech"],
    "AVGO": ["AI Data Center", "1.6T Networking"],
    "MRVL": ["AI Data Center", "1.6T Networking", "National Security Tech"],
    "ANET": ["1.6T Networking", "AI Data Center"],
    "VST":  ["Energy Grid", "AI Data Center"],
    "CEG":  ["Energy Grid", "National Security Tech"],
    "LITE": ["1.6T Networking", "AI Data Center", "National Security Tech"],
    "SMCI": ["AI Data Center", "National Security Tech"],
    "ONTO": ["National Security Tech", "Domestic Semiconductor"],
    "WOLF": ["Domestic Semiconductor", "Energy Grid"],
    "ASTS": ["National Security Tech"],
    "IONQ": ["National Security Tech", "Domestic Semiconductor"],
    "QUBT": ["National Security Tech"],
    "RGTI": ["National Security Tech"],
    "ACHR": ["Energy Grid"],
}

MOCK_FUNDAMENTALS: dict[str, dict] = {
    "NVDA": {"revenueGrowth": 1.22, "institutionalOwnership": 0.68, "grossMargin": 0.73, "isSoldOut": True},
    "AVGO": {"revenueGrowth": 0.51, "institutionalOwnership": 0.72, "grossMargin": 0.61, "isSoldOut": False},
    "MRVL": {"revenueGrowth": 0.61, "institutionalOwnership": 0.79, "grossMargin": 0.51, "isSoldOut": False},
    "ANET": {"revenueGrowth": 0.24, "institutionalOwnership": 0.81, "grossMargin": 0.64, "isSoldOut": False},
    "VST":  {"revenueGrowth": 0.43, "institutionalOwnership": 0.85, "grossMargin": 0.28, "isSoldOut": False},
    "CEG":  {"revenueGrowth": 0.38, "institutionalOwnership": 0.78, "grossMargin": 0.31, "isSoldOut": False},
    "LITE": {"revenueGrowth": 0.47, "institutionalOwnership": 0.62, "grossMargin": 0.44, "isSoldOut": True},
    "SMCI": {"revenueGrowth": 0.55, "institutionalOwnership": 0.45, "grossMargin": 0.15, "isSoldOut": True},
    "ONTO": {"revenueGrowth": 0.41, "institutionalOwnership": 0.91, "grossMargin": 0.47, "isSoldOut": False},
    "WOLF": {"revenueGrowth": 0.18, "institutionalOwnership": 0.55, "grossMargin": 0.12, "isSoldOut": False},
    "ASTS": {"revenueGrowth": 2.10, "institutionalOwnership": 0.41, "grossMargin": 0.22, "isSoldOut": False},
    "IONQ": {"revenueGrowth": 0.95, "institutionalOwnership": 0.38, "grossMargin": 0.55, "isSoldOut": False},
    "QUBT": {"revenueGrowth": 1.40, "institutionalOwnership": 0.28, "grossMargin": 0.48, "isSoldOut": False},
    "RGTI": {"revenueGrowth": 0.87, "institutionalOwnership": 0.31, "grossMargin": 0.51, "isSoldOut": False},
    "ACHR": {"revenueGrowth": 0.62, "institutionalOwnership": 0.44, "grossMargin": 0.18, "isSoldOut": False},
}

_DEFAULT_FUND = {"revenueGrowth": 0.1, "institutionalOwnership": 0.5, "grossMargin": 0.3, "isSoldOut": False}


def compute_breakout_score(revenue_growth: float, institutional_ownership: float, macro_keywords: list[str]) -> int:
    score = 0
    if revenue_growth > 0.4:
        score += 40
    elif revenue_growth > 0.2:
        score += 20
    elif revenue_growth > 0:
        score += 10
    score += min(institutional_ownership * 30, 30)
    score += min(len(macro_keywords) * 10, 30)
    return min(round(score), 100)


def compute_geopolitical_score(macro_keywords: list[str], sector: str) -> int:
    score = 30
    if "National Security Tech" in macro_keywords:
        score += 25
    if "1.6T Networking" in macro_keywords:
        score += 15
    if "AI Data Center" in macro_keywords:
        score += 15
    if "Domestic Semiconductor" in macro_keywords:
        score += 20
    if "Energy Grid" in macro_keywords:
        score += 10
    if "Technology" in sector:
        score += 5
    return min(score, 100)


def get_risk_profile(pe_ratio: float, revenue_growth: float) -> str:
    if pe_ratio > 50 or revenue_growth > 0.4:
        return "high_growth"
    if pe_ratio > 20 or revenue_growth > 0.15:
        return "balanced"
    return "value_stability"


async def screen_symbol(symbol: str) -> dict:
    fund = MOCK_FUNDAMENTALS.get(symbol, _DEFAULT_FUND)
    macro_keywords = MACRO_KEYWORD_MAP.get(symbol, [])
    revenue_growth = fund["revenueGrowth"]
    institutional_ownership = fund["institutionalOwnership"]

    try:
        quote, overview = await asyncio.gather(
            get_global_quote(symbol),
            get_company_overview(symbol),
        )
        price = quote["price"] if quote else 100.0
        pe_ratio = overview["peRatio"] if overview else 25.0
        market_cap = overview["marketCap"] if overview else 1e9
        sector = overview["sector"] if overview else "Technology"
        name = overview["name"] if overview else symbol
        change = quote["change"] if quote else 0.0
        change_percent = quote["changePercent"] if quote else 0.0
    except Exception:
        price, pe_ratio, market_cap, sector, name, change, change_percent = 0.0, 30.0, 0.0, "Technology", symbol, 0.0, 0.0

    return {
        "symbol": symbol,
        "name": name,
        "sector": sector,
        "price": price,
        "change": change,
        "changePercent": change_percent,
        "revenueGrowth": revenue_growth,
        "peRatio": pe_ratio,
        "marketCap": market_cap,
        "institutionalOwnership": institutional_ownership,
        "macroKeywords": macro_keywords,
        "geopoliticalScore": compute_geopolitical_score(macro_keywords, sector),
        "breakoutScore": compute_breakout_score(revenue_growth, institutional_ownership, macro_keywords),
        "riskProfile": get_risk_profile(pe_ratio, revenue_growth),
        "isSoldOut": fund["isSoldOut"],
    }


@router.get("/stocks/summary")
async def get_summary():
    sector_counts: dict[str, dict] = {}
    total_score = 0
    for sym in SCREENED_SYMBOLS:
        fund = MOCK_FUNDAMENTALS.get(sym, _DEFAULT_FUND)
        keywords = MACRO_KEYWORD_MAP.get(sym, [])
        score = compute_breakout_score(fund["revenueGrowth"], fund["institutionalOwnership"], keywords)
        total_score += score
        sector = "Energy" if sym in ("VST", "CEG", "ACHR") else "Technology"
        if sector not in sector_counts:
            sector_counts[sector] = {"count": 0, "totalScore": 0}
        sector_counts[sector]["count"] += 1
        sector_counts[sector]["totalScore"] += score

    top_sectors = [
        {"sector": s, "count": v["count"], "avgScore": round(v["totalScore"] / v["count"])}
        for s, v in sector_counts.items()
    ]
    high_growth_count = sum(1 for f in MOCK_FUNDAMENTALS.values() if f["revenueGrowth"] > 0.4)

    return {
        "totalScreened": len(SCREENED_SYMBOLS),
        "highGrowthCount": high_growth_count,
        "newDiscoveries": 3,
        "avgBreakoutScore": round(total_score / len(SCREENED_SYMBOLS)),
        "topSectors": top_sectors,
        "topMacroTheme": "AI Data Center Buildout",
    }


@router.get("/stocks/screen")
async def screen_stocks(riskProfile: Optional[str] = Query(default=None)):
    results = await asyncio.gather(*[screen_symbol(sym) for sym in SCREENED_SYMBOLS])
    results = list(results)
    if riskProfile:
        results = [r for r in results if r["riskProfile"] == riskProfile]
    results.sort(key=lambda r: r["breakoutScore"], reverse=True)
    return results


@router.get("/stocks/{symbol}/quote")
async def get_quote(symbol: str):
    symbol = symbol.upper()
    fund = MOCK_FUNDAMENTALS.get(symbol, _DEFAULT_FUND)
    quote, overview = await asyncio.gather(
        get_global_quote(symbol),
        get_company_overview(symbol),
    )
    if not quote and not overview:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Symbol not found")
    return {
        "symbol": symbol,
        "name": overview["name"] if overview else symbol,
        "price": quote["price"] if quote else 0.0,
        "open": quote["open"] if quote else 0.0,
        "high": quote["high"] if quote else 0.0,
        "low": quote["low"] if quote else 0.0,
        "volume": quote["volume"] if quote else 0.0,
        "peRatio": overview["peRatio"] if overview else 0.0,
        "eps": overview["eps"] if overview else 0.0,
        "revenueGrowth": fund["revenueGrowth"],
        "grossMargin": fund["grossMargin"],
        "institutionalOwnership": fund["institutionalOwnership"],
        "fiftyTwoWeekHigh": overview["fiftyTwoWeekHigh"] if overview else 0.0,
        "fiftyTwoWeekLow": overview["fiftyTwoWeekLow"] if overview else 0.0,
        "marketCap": overview["marketCap"] if overview else 0.0,
        "dividendYield": overview["dividendYield"] if overview else 0.0,
    }


@router.get("/stocks/{symbol}/news")
async def get_news(symbol: str, limit: int = Query(default=10)):
    symbol = symbol.upper()
    return await get_news_and_sentiment(symbol, limit)
